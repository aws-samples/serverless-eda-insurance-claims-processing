// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export default function createUpdateIOTPolicyFunction(
  scope: Construct
): NodejsFunction {
  const attachPolicyStatement = new PolicyStatement({
    actions: ["iot:AttachPolicy"],
    resources: ["*"],
    effect: Effect.ALLOW,
  });

  const updateIOTPolicyFunction = new NodejsFunction(
    scope,
    "UpdateIOTPolicyFunction",
    {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: "app/handlers/updateIOTPolicy/index.js",
    }
  );

  updateIOTPolicyFunction.addToRolePolicy(attachPolicyStatement);

  return updateIOTPolicyFunction;
}
