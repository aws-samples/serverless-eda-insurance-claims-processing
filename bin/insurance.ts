// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Aspects, Fn } from "aws-cdk-lib";
import { ClaimsProcessingStack } from "../lib/claims-processing-stack";
import { VoiceFnolStack } from "../lib/voice-fnol-stack";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";

const app = new cdk.App();

// Add the cdk-nag AwsSolutions Pack with extra verbose logging enabled.
Aspects.of(app).add(new AwsSolutionsChecks({verbose: true}));

// Create Claims Processing Stack first
const claimsStack = new ClaimsProcessingStack(app, "ClaimsProcessingStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Create Voice FNOL Stack with dependency on Claims Stack
const voiceFnolStack = new VoiceFnolStack(app, "VoiceFnolStack", {
  fnolApiEndpoint: Fn.importValue("ClaimsProcessingStack-FnolApiEndpoint"),
  fnolApiId: Fn.importValue("ClaimsProcessingStack-FnolApiId"),
  customerApiEndpoint: Fn.importValue("ClaimsProcessingStack-CustomerApiEndpoint"),
  customerApiId: Fn.importValue("ClaimsProcessingStack-CustomerApiId"),
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Explicit dependency: Voice FNOL Stack depends on Claims Processing Stack
voiceFnolStack.addDependency(claimsStack);

NagSuppressions.addStackSuppressions(claimsStack, [
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
    id: "AwsSolutions-APIG1",
    reason: "Access log is skipped for Settlement HTTP API.",
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
  {
    id: 'AwsSolutions-SF1',
    reason: 'Logging not necessary for demo purposes'
  },
  {
    id: 'AwsSolutions-SF2',
    reason: 'X-Ray will be added eventually'
  }
], true);

NagSuppressions.addResourceSuppressions(claimsStack, [
  {
    id: "AwsSolutions-EKS1",
    reason: "Default VPC is used for demo purposes.",
  },
  {
    id: "AwsSolutions-IAM4",
    reason: "Default Lambda Execution Role for Lambda functions created by EKS Cluster.",
    appliesTo: [
      'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    ]
  },
  {
    id: "AwsSolutions-IAM5",
    reason: "Resources created by EKS clusters",
    appliesTo: ['Action::s3:*']
  }
], true);

// NAG Suppressions for Voice FNOL Stack
NagSuppressions.addStackSuppressions(voiceFnolStack, [
  {
    id: "AwsSolutions-IAM4",
    reason: "Managed policies required for Lambda VPC execution and AgentCore.",
  },
  {
    id: "AwsSolutions-IAM5",
    reason: "Wildcard permissions required for Bedrock model access and CloudWatch logs.",
  },
  {
    id: "AwsSolutions-EC23",
    reason: "Security group allows all outbound traffic for AgentCore Runtime to access Bedrock and FNOL API.",
  },
  {
    id: "AwsSolutions-L1",
    reason:
      "Only functions that are left are AwsCustomResource related functions, and there's no way to specify runtime for them. These should be fixed in time automatically.  ",
  }
], true);
