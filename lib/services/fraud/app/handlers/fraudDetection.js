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

// Triggered by *.Document.Processed event which contains metadata

// Check for document fraud

// Put Events
// Fraud.Document.Detected

let customerId, analyzedFieldAndValues, documentType, recordId;

exports.handler = async function (event) {
  console.log(JSON.stringify(event, 2, null));
  console.log("Fraud Detection Lambda Function Called");

  customerId = event.detail.customerId;
  analyzedFieldAndValues = event.detail.analyzedFieldAndValues;
  documentType = event.detail.documentType;
  recordId = undefined;

  switch (documentType) {
    case "DRIVERS_LICENSE":
      await checkIdentityFraud(
        customerId,
        analyzedFieldAndValues,
        documentType
      );
      break;
    case "CAR":
      await checkInsuredAssetFraud(event.detail);
      break;
    default:
      break;
  }

  return "Fraud Detection Lambda called";
};

async function checkIdentityFraud(
  customerId,
  analyzedFieldAndValues,
  documentType
) {
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

async function checkInsuredAssetFraud(eventDetail) {
  let fraudReason;
  if (
    eventDetail.analyzedFieldAndValues &&
    eventDetail.analyzedFieldAndValues.type === "claims"
  ) {
    fraudReason = "No damage detected.";
    fraudReason = await checkClaimsFraud(eventDetail, fraudReason);
    await publishInsuredAssetFraudResult(fraudReason, "CLAIMS");
  } else if (eventDetail.analyzedFieldAndValues.type === "signup") {
    recordId = eventDetail.recordId;
    const policy = await getPolicyRecord(recordId, eventDetail);
    fraudReason = matchColor(eventDetail.analyzedFieldAndValues.color, policy);
    await publishInsuredAssetFraudResult(fraudReason, "SIGNUP.CAR");
  }
}

async function checkClaimsFraud(eventDetail, fraudReason) {
  if (
    eventDetail.analyzedFieldAndValues.damage &&
    eventDetail.analyzedFieldAndValues.damage.Name !== "unknown"
  ) {
    const claimRecord = await getClaimRecord(eventDetail);
    const policy = await getPolicyRecord(claimRecord.policyId, eventDetail);
    fraudReason = matchColor(eventDetail.analyzedFieldAndValues.color, policy);
  }
  return fraudReason;
}

async function publishInsuredAssetFraudResult(fraudReason, fraudType) {
  let entry = {
    DetailType: "Fraud.Not.Detected",
    Source: "fraud.service",
    EventBusName: process.env.BUS_NAME,
    Detail: JSON.stringify({
      customerId,
      documentType,
      analyzedFieldAndValues,
      recordId,
      fraudType: fraudType,
    }),
  };

  if (fraudReason) {
    entry.DetailType = "Fraud.Detected";
    entry.Detail = JSON.stringify({
      customerId,
      documentType,
      fraudType: fraudType,
      fraudReason: fraudReason,
    });
  }

  let putEventsCommand = new PutEventsCommand({
    Entries: [entry],
  });

  await ebClient.send(putEventsCommand);
}

function matchColor(color, policy) {
  let fraudReason;

  if (
    !color ||
    !color.Name ||
    color.Name.toLowerCase() !== policy.color.toLowerCase()
  ) {
    fraudReason = "Color of vehicle doesn't match the color on the policy.";
  }

  return fraudReason;
}

async function getPolicyRecord(policyId, eventDetail) {
  const getPolicyParams = {
    Key: {
      PK: { S: policyId },
      SK: { S: `Customer|${eventDetail.customerId}` },
    },
    TableName: process.env.POLICY_TABLE_NAME,
  };

  const { Item: policyItem } = await ddbClient.send(
    new GetItemCommand(getPolicyParams)
  );

  const policy = unmarshall(policyItem);
  return policy;
}

async function getClaimRecord(eventDetail) {
  recordId = eventDetail.recordId;
  const getClaimsParams = {
    Key: {
      PK: { S: recordId },
      SK: { S: `Customer|${eventDetail.customerId}` },
    },
    TableName: process.env.CLAIMS_TABLE_NAME,
  };

  const { Item: claimsItem } = await ddbClient.send(
    new GetItemCommand(getClaimsParams)
  );

  const claimRecord = unmarshall(claimsItem);
  return claimRecord;
}
