// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Aspects } from "aws-cdk-lib";
import { ClaimsProcessingStack } from "../lib/claims-processing-stack";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";

const app = new cdk.App();

// Add the cdk-nag AwsSolutions Pack with extra verbose logging enabled.
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}));

const mStack = new ClaimsProcessingStack(app, "ClaimsProcessingStack", {});

NagSuppressions.addStackSuppressions(mStack, [
  {
    id: "AwsSolutions-S1",
    reason: "Server access logging not required for demo.",
  },
  {
    id: "AwsSolutions-IAM4",
    reason: "Default Lambda Execution Role.",
  },
  {
    id: "AwsSolutions-IAM5",
    reason: "Will refine these permissions in next version.",
  },
  {
    id: "AwsSolutions-DDB3",
    reason: "PITR not required for demo application.",
  },
  {
    id: "AwsSolutions-APIG2",
    reason: "Implement this when focusing on security best practices.",
  },
  {
    id: "AwsSolutions-APIG3",
    reason: "WAF not required for demo.",
  },
  {
    id: "AwsSolutions-APIG4",
    reason: "OPTIONS call for CORS does not require authentication",
  },
  {
    id: "AwsSolutions-COG4",
    reason: "OPTIONS call for CORS does not require authentication",
  },
  {
    id: "AwsSolutions-SQS3",
    reason: "DLQ not required for demo app.",
  },
  {
    id: "AwsSolutions-L1",
    reason:
      "Only functions that are left are AwsCustomResource related functions, and there's no way to specify runtime for them. These should be fixed in time automatically.  ",
  },
  {
    id: 'AwsSolutions-VPC7',
    reason: 'Not necessary for demo.'
  },
  {
    id: 'AwsSolutions-ECS4',
    reason: 'Container Insights will be added when focusing on observability throughout the app.'
  },
  {
    id: 'AwsSolutions-ECS2',
    reason: 'Not necessary to use Secrets Manager for demo purposes.'
  },
  {
    id: 'AwsSolutions-ELB2',
    reason: 'Access logging Will be added when focusing on observability throughout the app.'
  },
  {
    id: 'AwsSolutions-EC23',
    reason: 'Will be modified after initial testing'
  },
]);
