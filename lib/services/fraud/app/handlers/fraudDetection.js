// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async function (event) {
  console.log(JSON.stringify(event, 2, null));
  const { documentType } = event.detail;

  switch (documentType) {
    case "DRIVERS_LICENSE":
      await checkIdentityFraud(event.detail);
      break;
    case "CAR":
      await checkInsuredAssetFraud(event.detail);
      break;
    default:
      break;
  }

  return "Fraud Detection Lambda called";
};

async function checkIdentityFraud({
  customerId,
  analyzedFieldAndValues,
  documentType,
}) {
  let fraud = {},
    putEventsCommand;

  const params = {
    KeyConditionExpression: "PK = :s",
    ExpressionAttributeValues: {
      ":s": { S: customerId },
    },
    TableName: process.env.CUSTOMER_TABLE_NAME,
  };

  try {
    const { Items } = await ddbClient.send(new QueryCommand(params));

    let item;
    for (let index = 0; index < Items.length; index++) {
      const iterItem = Items[index];
      if (iterItem.firstname) {
        item = unmarshall(iterItem);
        break;
      }
    }

    console.log("GetItem from DB: " + JSON.stringify(item));

    fraud.isDetected =
      item?.firstname &&
      analyzedFieldAndValues?.FIRST_NAME &&
      item.firstname?.toLowerCase() !==
        analyzedFieldAndValues.FIRST_NAME?.toLowerCase();

    if (fraud.isDetected) {
      fraud.reason =
        "First Name provided does not match with First Name in Driver's License";
    }

    console.log("Fraud Detection Object: " + JSON.stringify(fraud, 2, null));

    if (fraud.isDetected) {
      putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            DetailType: "Fraud.Detected",
            Source: "fraud.service",
            EventBusName: process.env.BUS_NAME,
            Detail: JSON.stringify({
              customerId,
              documentType,
              fraudType: "DOCUMENT",
              fraudReason: fraud.reason,
            }),
          },
        ],
      });
    } else {
      putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            DetailType: "Fraud.Not.Detected",
            Source: "fraud.service",
            EventBusName: process.env.BUS_NAME,
            Detail: JSON.stringify({
              customerId,
              documentType,
              analyzedFieldAndValues,
              fraudType: "DOCUMENT",
            }),
          },
        ],
      });
    }

    await ebClient.send(putEventsCommand);
  } catch (e) {
    console.log(e);
  }
}

async function checkInsuredAssetFraud({
  customerId,
  recordId,
  analyzedFieldAndValues,
  documentType,
}) {
  let fraudReason;

  if (analyzedFieldAndValues && analyzedFieldAndValues.type === "claims") {
    fraudReason = "No damage detected.";
    fraudReason = await checkClaimsFraud(
      customerId,
      recordId,
      analyzedFieldAndValues,
      fraudReason
    );
    await publishInsuredAssetFraudResult({
      customerId,
      recordId,
      documentType,
      analyzedFieldAndValues,
      fraudReason,
      fraudType: "CLAIMS",
    });
  } else if (analyzedFieldAndValues.type === "signup") {
    const policy = await getPolicyRecord(recordId, customerId);
    fraudReason = matchColor(analyzedFieldAndValues.color, policy);
    await publishInsuredAssetFraudResult({
      customerId,
      recordId,
      documentType,
      analyzedFieldAndValues,
      fraudReason,
      fraudType: "SIGNUP.CAR",
    });
  }
}

async function checkClaimsFraud(
  customerId,
  claimId,
  { damage, color },
  fraudReason
) {
  if (damage && damage.Name && damage.Name !== "unknown" && damage.Name !== "none") {
    const claimRecord = await getClaimRecord(claimId, customerId);
    const policy = await getPolicyRecord(claimRecord.policyId, customerId);
    fraudReason = matchColor(color, policy);
  }
  return fraudReason;
}

async function publishInsuredAssetFraudResult({
  customerId,
  recordId,
  documentType,
  analyzedFieldAndValues,
  fraudReason,
  fraudType,
}) {
  let entry = {
    DetailType: "Fraud.Not.Detected",
    Source: "fraud.service",
    EventBusName: process.env.BUS_NAME,
    Detail: JSON.stringify({
      customerId,
      recordId,
      documentType,
      analyzedFieldAndValues,
      fraudType,
    }),
  };

  if (fraudReason) {
    entry.DetailType = "Fraud.Detected";
    entry.Detail = JSON.stringify({
      customerId,
      recordId,
      documentType,
      fraudType,
      fraudReason,
    });
  }

  let putEventsCommand = new PutEventsCommand({
    Entries: [entry],
  });

  await ebClient.send(putEventsCommand);
}

function matchColor(color, policy) {
  let fraudReason;

  // Extract color name from the object structure
  const colorName = color?.Name || color;
  const policyColor = policy?.color;

  if (
    !colorName ||
    !policyColor ||
    colorName.toLowerCase() !== policyColor.toLowerCase()
  ) {
    fraudReason = "Color of vehicle doesn't match the color on the policy.";
  }

  return fraudReason;
}

async function getPolicyRecord(policyId, customerId) {
  const getPolicyParams = {
    Key: {
      PK: { S: policyId },
      SK: { S: `Customer|${customerId}` },
    },
    TableName: process.env.POLICY_TABLE_NAME,
  };

  const { Item: policyItem } = await ddbClient.send(
    new GetItemCommand(getPolicyParams)
  );

  const policy = unmarshall(policyItem);
  return policy;
}

async function getClaimRecord(claimId, customerId) {
  const getClaimsParams = {
    Key: {
      PK: { S: claimId },
      SK: { S: `Customer|${customerId}` },
    },
    TableName: process.env.CLAIMS_TABLE_NAME,
  };

  const { Item: claimsItem } = await ddbClient.send(
    new GetItemCommand(getClaimsParams)
  );

  const claimRecord = unmarshall(claimsItem);
  return claimRecord;
}
