// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  DynamoDBClient,
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
  const { Items: idRecord } = await ddbClient.send(
    new ScanCommand(findCustomerParams)
  );

  if (idRecord && idRecord.length > 0) {
    const uItem = unmarshall(idRecord["0"]);
    const PK = uItem.PK;

    const getCustDetailsParams = {
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: PK },
      },
      TableName: process.env.CUSTOMER_TABLE_NAME,
    };

    const { Items: customerRecords } = await ddbClient.send(
      new QueryCommand(getCustDetailsParams)
    );

    customerRecords.forEach((customerRecord) => {
      const uCustRec = unmarshall(customerRecord);
      if (uCustRec.SK !== "COGNITO_IDENTITY_ID") {
        custDetails = uCustRec;
      }
    });

    const getPoliciesParams = {
      FilterExpression: "SK = :sk",
      ExpressionAttributeValues: {
        ":sk": { S: `Customer|${custDetails.PK}` },
      },
      TableName: process.env.POLICY_TABLE_NAME,
    };

    const { Items: policies } = await ddbClient.send(
      new ScanCommand(getPoliciesParams)
    );

    custDetails["policies"] = policies;
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
