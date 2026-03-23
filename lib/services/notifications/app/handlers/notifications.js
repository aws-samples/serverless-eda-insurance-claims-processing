// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { SignatureV4 } = require("@smithy/signature-v4");
const { Sha256 } = require("@aws-crypto/sha256-js");
const { HttpRequest } = require("@smithy/protocol-http");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const https = require("https");

const docClient = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async function (event) {
  console.log(JSON.stringify(event, 2, null));
  console.log("Notifications Lambda Function Called, event = ", event);

  const { sub, customerId } = event.detail;
  const userSub = sub ? sub : await getUserSub(customerId);

  if (!userSub) {
    console.log("No user sub found for customer:", customerId);
    return "No user sub found";
  }

  try {
    await publishToAppSyncEvents(userSub, event);
    console.log("Published event to AppSync Events");
  } catch (error) {
    console.log("Error publishing to AppSync Events:", error);
  }

  return "Notifications Lambda called";
};

async function getUserSub(customerId) {
  const command = new GetItemCommand({
    TableName: process.env.CUSTOMER_TABLE_NAME,
    Key: marshall(
      { PK: customerId, SK: "USER_SUB" },
      { removeUndefinedValues: true }
    ),
    ProjectionExpression: "#sub",
    ExpressionAttributeNames: { "#sub": "sub" },
  });

  const { Item } = await docClient.send(command);
  if (!Item) return null;
  return unmarshall(Item).sub;
}

async function publishToAppSyncEvents(userSub, event) {
  const domain = process.env.APPSYNC_EVENTS_HTTP_DOMAIN;

  const body = JSON.stringify({
    channel: `/notifications/${userSub}`,
    events: [JSON.stringify(event)],
  });

  const request = new HttpRequest({
    method: "POST",
    hostname: domain,
    path: "/event",
    headers: {
      "Content-Type": "application/json",
      host: domain,
    },
    body,
  });

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: process.env.AWS_REGION,
    service: "appsync",
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: signedRequest.hostname,
        path: signedRequest.path,
        method: signedRequest.method,
        headers: signedRequest.headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          console.log("AppSync Events response:", res.statusCode, data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`AppSync Events returned ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(signedRequest.body);
    req.end();
  });
}
