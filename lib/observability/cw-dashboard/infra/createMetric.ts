// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { EventSourceMapping, Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

export default function createMetricsQueueWithLambdaSubscription(
  scope: Construct
): Queue {
  const metricsQueue = new Queue(scope, "MetricsQueue", { enforceSSL: true });

  const metricsLambdaRole = new Role(
    scope,
    "MetricsQueueConsumerFunctionRole",
    {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaSQSQueueExecutionRole"
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    }
  );

  const createMetricsFunction = new NodejsFunction(
    scope,
    "CreateMetricsFunction",
    {
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/create.js`,
      role: metricsLambdaRole,
    }
  );

  new EventSourceMapping(scope, "MetricsQueueFunctionESM", {
    target: createMetricsFunction,
    batchSize: 10,
    eventSourceArn: metricsQueue.queueArn,
  });

  return metricsQueue;
}
