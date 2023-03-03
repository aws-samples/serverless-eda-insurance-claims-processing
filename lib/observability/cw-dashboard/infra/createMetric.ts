// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { SqsToLambda } from "@aws-solutions-constructs/aws-sqs-lambda";
import { Queue } from "aws-cdk-lib/aws-sqs";

export default function createMetricsQueueWithLambdaSubscription(
  scope: Construct
): Queue {
  const createMetricsFunction = new NodejsFunction(
    scope,
    "CreateMetricsFunction",
    {
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/create.js`,
    }
  );

  const sqsToLambda = new SqsToLambda(scope, "MetricsQueueToLambdaFunction", {
    existingLambdaObj: createMetricsFunction,
  });

  return sqsToLambda.sqsQueue;
}
