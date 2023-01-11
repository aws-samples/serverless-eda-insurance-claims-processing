// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

exports.handler = async function (event, context) {
  console.log("event --> ", event);

  const message = {
    data: event.body,
    cognitoIdentityId: event.requestContext.identity.cognitoIdentityId,
  };

  console.log("message = ", message);

  // PutEvents
  const command = new PutEventsCommand({
    Entries: [
      {
        DetailType: "Customer.Submitted",
        Source: "signup.service",
        EventBusName: process.env.BUS_NAME,
        Detail: JSON.stringify(message),
      },
    ],
  });

  try {
    const response = await ebClient.send(command);
  } catch (error) {
    console.error(error);
  }

  const resp = { message: "Customer Submitted" };

  return {
    statusCode: 200,
    body: JSON.stringify(resp),
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
