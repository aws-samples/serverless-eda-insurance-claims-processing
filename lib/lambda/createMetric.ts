// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export default function createMetricsFunction(
  scope: Construct
): NodejsFunction {
  const createMetricsFunction = new NodejsFunction(
    scope,
    "CreateMetricsFunction",
    {
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: "app/handlers/metrics/create.js",
    }
  );
  return createMetricsFunction;
}
