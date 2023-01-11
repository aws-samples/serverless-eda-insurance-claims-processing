// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export default function createValidatorFunction(
  scope: Construct
): NodejsFunction {
  const validatorFunction = new NodejsFunction(scope, "ValidatorFunction", {
    runtime: Runtime.NODEJS_18_X,
    memorySize: 512,
    logRetention: RetentionDays.ONE_WEEK,
    handler: "handler",
    entry: "app/handlers/utils/validator.js",
  });

  return validatorFunction;
}
