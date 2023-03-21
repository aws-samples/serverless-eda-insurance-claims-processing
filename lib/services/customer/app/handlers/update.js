// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Get Event Body from Event Bridge
// Update analyzed id document fields in customer item
// Update Customer in database
// Put Events (Customer.Document.Updated)

const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");

const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });
const docClient = new DynamoDBClient();

exports.handler = async function (event, context) {
  const {
    detail: { customerId, analyzedFieldAndValues, documentType },
  } = event;

  try {
    const params = {
      TableName: process.env.CUSTOMER_TABLE_NAME,
      Item: marshall({
        PK: customerId,
        SK: `${documentType}`,
        ...analyzedFieldAndValues,
      }),
    };

    const result = await docClient.send(new PutItemCommand(params));

    const command = new PutEventsCommand({
      Entries: [
        {
          DetailType: "Customer.Document.Updated",
          Source: "customer.service",
          EventBusName: process.env.BUS_NAME,
          Detail: JSON.stringify({
            customerId,
            documentType,
          }),
        },
      ],
    });

    const response = await ebClient.send(command);
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 201,
    body: "Customer Document Updated",
  };
};
