// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  DynamoDBClient,
  BatchWriteItemCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");

const { unmarshall } = require("@aws-sdk/util-dynamodb");

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async function (event, context) {
  let deleteResp = {};
  const findCustomerParams = {
    FilterExpression: "SK = :sk AND cognitoIdentityId = :identifier",
    ExpressionAttributeValues: {
      ":sk": { S: "COGNITO_IDENTITY_ID" },
      ":identifier": { S: event.requestContext.identity.cognitoIdentityId },
    },
    TableName: process.env.CUSTOMER_TABLE_NAME,
  };

  const { Items: idRecords } = await ddbClient.send(
    new ScanCommand(findCustomerParams)
  );

  if (idRecords && idRecords.length > 0) {
    const uItem = unmarshall(idRecords["0"]);
    const customerUUID = uItem.PK;

    const getCustDetailsInput = {
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: customerUUID },
      },
      TableName: process.env.CUSTOMER_TABLE_NAME,
    };

    const { Items: customerRecords } = await ddbClient.send(
      new QueryCommand(getCustDetailsInput)
    );

    const deleteCustReqs = [];
    const deletePolicyReqs = [];
    const deleteClaimReqs = [];


    customerRecords.forEach((customerRecord) => {
      const uCustRecord = unmarshall(customerRecord);
      const delCustReq = {
        DeleteRequest: {
          Key: {
            PK: {
              S: customerUUID,
            },
            SK: {
              S: uCustRecord.SK,
            },
          },
        },
      };
      deleteCustReqs.push(delCustReq);
    });

    const findCustomerPoliciesInput = {
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: {
        ":sk": { S: `Customer|${customerUUID}` },
      },
      TableName: process.env.POLICY_TABLE_NAME,
    };

    const { Items: policies } = await ddbClient.send(
      new ScanCommand(findCustomerPoliciesInput)
    );

    policies.forEach((policy) => {
      const uPolicy = unmarshall(policy);
      const delPolicyReq = {
        DeleteRequest: {
          Key: {
            PK: {
              S: uPolicy.PK,
            },
            SK: {
              S: uPolicy.SK,
            },
          },
        },
      };
      deletePolicyReqs.push(delPolicyReq);
    });

    const findCustomerClaimsInput = {
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: {
        ":sk": { S: `Customer|${customerUUID}` },
      },
      TableName: process.env.CLAIMS_TABLE_NAME,
    };

    const { Items: claims } = await ddbClient.send(
      new ScanCommand(findCustomerClaimsInput)
    );

    claims.forEach((claim) => {
      const uClaim = unmarshall(claim);
      const delClaimReq = {
        DeleteRequest: {
          Key: {
            PK: {
              S: uClaim.PK,
            },
            SK: {
              S: uClaim.SK,
            },
          },
        },
      };
      deleteClaimReqs.push(delClaimReq);
    });

    

    const batchWriteCmdInput = {
      RequestItems: {
        [process.env.CUSTOMER_TABLE_NAME]: deleteCustReqs,
        [process.env.POLICY_TABLE_NAME]: deletePolicyReqs,
        [process.env.CLAIMS_TABLE_NAME]: deleteClaimReqs,
      },
    };

    console.log('batchWriteCmdInput = ', batchWriteCmdInput)

    deleteResp = await ddbClient.send(
      new BatchWriteItemCommand(batchWriteCmdInput)
    );

    console.log('deleteResp = ', deleteResp)
  }
  return {
    statusCode: 200,
    body: JSON.stringify(deleteResp),
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
