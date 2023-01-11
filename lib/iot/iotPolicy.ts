// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from "constructs";
import { CfnPolicy } from "aws-cdk-lib/aws-iot";

export default function create_iot_policy(scope: Construct): CfnPolicy {
  const cfnPolicy = new CfnPolicy(scope, "IOT_POLICY", {
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "iot:Connect",
          Resource:
            "arn:aws:iot:" +
            process.env.CDK_DEFAULT_REGION +
            ":" +
            process.env.CDK_DEFAULT_ACCOUNT +
            ":*",
        },
        {
          Effect: "Allow",
          Action: "iot:Publish",
          Resource:
            "arn:aws:iot:" +
            process.env.CDK_DEFAULT_REGION +
            ":" +
            process.env.CDK_DEFAULT_ACCOUNT +
            ":*",
        },
        {
          Effect: "Allow",
          Action: "iot:Receive",
          Resource:
            "arn:aws:iot:" +
            process.env.CDK_DEFAULT_REGION +
            ":" +
            process.env.CDK_DEFAULT_ACCOUNT +
            ":*",
        },
        {
          Effect: "Allow",
          Action: "iot:Subscribe",
          Resource:
            "arn:aws:iot:" +
            process.env.CDK_DEFAULT_REGION +
            ":" +
            process.env.CDK_DEFAULT_ACCOUNT +
            ":topicfilter/${cognito-identity.amazonaws.com:sub}",
        },
      ],
    },
    policyName: "IOT_POLICY",
  });

  return cfnPolicy;
}
