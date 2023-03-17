// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Logger } from "@aws-lambda-powertools/logger";
import { AttachPolicyCommand, IoTClient } from "@aws-sdk/client-iot";

const logger = new Logger({ serviceName: "updateIOTPolicy" });
const iotClient = new IoTClient({ region: process.env.AWS_REGION });

exports.handler = async function (event) {
  logger.info("event = ", JSON.stringify(event));

  const input = {
    policyName: process.env.IOT_POLICY_NAME,
    target: event.requestContext.identity.cognitoIdentityId,
  };

  const command = new AttachPolicyCommand(input);
  await iotClient.send(command);
  const resp = {};

  return {
    statusCode: 204,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    isBase64Encoded: false,
  };
};
