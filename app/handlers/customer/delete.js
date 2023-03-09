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

  const findCustomerParams = {
    FilterExpression: "SK = :sk AND cognitoIdentityId = :identifier",
    ExpressionAttributeValues: {
      ":sk": { S: "COGNITO_IDENTITY_ID" },
      ":identifier": { S: event.requestContext.identity.cognitoIdentityId },
    },
    TableName: process.env.CUSTOMER_TABLE_NAME,
  };

  let custDetails = {};
  const { Items: idRecords } = await ddbClient.send(
    new ScanCommand(findCustomerParams)
  );

  if (idRecords && idRecords.length > 0) {
    const uItem = unmarshall(idRecords["0"]);
    const PK = uItem.PK;

    const getCustDetailsInput = {
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: PK },
      },
      TableName: process.env.CUSTOMER_TABLE_NAME,
    };

    const { Items: customerRecords } = await ddbClient.send(
      new QueryCommand(getCustDetailsInput)
    );

    const deleteCustReqs = [];

    customerRecords.forEach((customerRecord) => {
      const uCustRecd = unmarshall(customerRecord);
      const delCustReq = {
        DeleteRequest: {
          Key: {
            PK: {
              S: PK,
            },
            SK: {
              S: uCustRecd.SK,
            },
          },
        },
      };
      deleteCustReqs.push(delCustReq);
    });

    const batchWriteCmdInput = {
      RequestItems: {
        [process.env.CUSTOMER_TABLE_NAME]: deleteCustReqs,
      },
    };

    const deleteResp = await ddbClient.send(
      new BatchWriteItemCommand(batchWriteCmdInput)
    );

    
  }
  return {
    statusCode: 200,
    body: JSON.stringify(custDetails),
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
