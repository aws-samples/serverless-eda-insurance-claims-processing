// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";

const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const client = new IoTDataPlaneClient({ region: process.env.AWS_REGION });

exports.handler = async function (event) {
  console.log(JSON.stringify(event, 2, null));
  console.log("Notifications Lambda Function Called, event = ", event);

  const { cognitoIdentityId, customerId } = event.detail;
  const identityId = cognitoIdentityId ? cognitoIdentityId : await getIdentityId(customerId);

  const input = {
    payload: JSON.stringify(event),
    topic: identityId,
  };

  const command = new PublishCommand(input);

  try {
    const data = await client.send(command);
    console.log("Published, data = ", data);
  } catch (error) {
    console.log("error while publishing, error = ", error);
  }

  return "Notifications Lambda called";
};

async function getIdentityId(customerId) {
  const customerCognitoCommand = new GetItemCommand({
    TableName: process.env.CUSTOMER_TABLE_NAME,
    Key: marshall(
      {
        PK: customerId,
        SK: "COGNITO_IDENTITY_ID",
      },
      { removeUndefinedValues: true }
    ),
    ProjectionExpression: "cognitoIdentityId",
  });

  const { Item } = await docClient.send(customerCognitoCommand);
  const item = unmarshall(Item);

  return item.cognitoIdentityId;
}
