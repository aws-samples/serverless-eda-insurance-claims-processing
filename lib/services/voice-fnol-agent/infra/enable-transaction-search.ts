// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CustomResource, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as path from "path";

/**
 * Custom resource to enable CloudWatch Transaction Search for AgentCore Observability
 * 
 * This is a one-time setup per AWS account that:
 * 1. Creates a resource policy for X-Ray to write spans to CloudWatch Logs
 * 2. Configures X-Ray to send trace segments to CloudWatch Logs
 * 3. Sets up indexing rules for Transaction Search
 * 
 * @example
 * ```typescript
 * new EnableTransactionSearch(this, 'EnableTransactionSearch', {
 *   samplingPercentage: 1, // 1% is free tier
 * });
 * ```
 */
export interface EnableTransactionSearchProps {
  /**
   * Percentage of traces to index (1-100)
   * 
   * @default 1 (free tier)
   */
  readonly samplingPercentage?: number;
}

export class EnableTransactionSearch extends Construct {
  constructor(scope: Construct, id: string, props?: EnableTransactionSearchProps) {
    super(scope, id);

    const samplingPercentage = props?.samplingPercentage ?? 1;
    const account = Stack.of(this).account;
    const region = Stack.of(this).region;

    // Create Lambda function to enable Transaction Search
    const enableTransactionSearchFn = new lambda.Function(this, "EnableTransactionSearchFn", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      timeout: Duration.seconds(60),
      logGroup: new logs.LogGroup(this, "EnableTransactionSearchFnLogs", {
        retention: logs.RetentionDays.FIVE_DAYS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      code: lambda.Code.fromInline(`
import boto3
import json
import cfnresponse

logs_client = boto3.client('logs')
xray_client = boto3.client('xray')

def handler(event, context):
    try:
        request_type = event['RequestType']
        sampling_percentage = float(event['ResourceProperties']['SamplingPercentage'])
        account_id = event['ResourceProperties']['AccountId']
        region = event['ResourceProperties']['Region']
        
        if request_type == 'Create' or request_type == 'Update':
            # Step 1: Create resource policy for X-Ray to write to CloudWatch Logs
            policy_document = {
                "Version": "2012-10-17",
                "Statement": [{
                    "Sid": "TransactionSearchXRayAccess",
                    "Effect": "Allow",
                    "Principal": {"Service": "xray.amazonaws.com"},
                    "Action": "logs:PutLogEvents",
                    "Resource": [
                        f"arn:aws:logs:{region}:{account_id}:log-group:aws/spans:*",
                        f"arn:aws:logs:{region}:{account_id}:log-group:/aws/application-signals/data:*"
                    ],
                    "Condition": {
                        "ArnLike": {"aws:SourceArn": f"arn:aws:xray:{region}:{account_id}:*"},
                        "StringEquals": {"aws:SourceAccount": account_id}
                    }
                }]
            }
            
            try:
                logs_client.put_resource_policy(
                    policyName='AgentCoreTransactionSearchPolicy',
                    policyDocument=json.dumps(policy_document)
                )
                print("Resource policy created successfully")
            except logs_client.exceptions.LimitExceededException:
                print("Resource policy already exists, skipping")
            except Exception as e:
                print(f"Warning: Failed to create resource policy: {str(e)}")
            
            # Step 2: Configure X-Ray to send traces to CloudWatch Logs
            try:
                xray_client.update_trace_segment_destination(
                    Destination='CloudWatchLogs'
                )
                print("Trace segment destination updated to CloudWatch Logs")
            except Exception as e:
                print(f"Warning: Failed to update trace destination: {str(e)}")
            
            # Step 3: Configure sampling percentage
            try:
                xray_client.update_indexing_rule(
                    Name='Default',
                    Rule={
                        'Probabilistic': {
                            'DesiredSamplingPercentage': sampling_percentage
                        }
                    }
                )
                print(f"Indexing rule updated with {sampling_percentage}% sampling")
            except Exception as e:
                print(f"Warning: Failed to update indexing rule: {str(e)}")
            
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {
                'Message': 'Transaction Search enabled successfully',
                'SamplingPercentage': sampling_percentage
            })
        
        elif request_type == 'Delete':
            # On delete, we don't remove the configuration as it's account-wide
            # and may be used by other stacks
            print("Delete request received - keeping Transaction Search enabled")
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
        
    except Exception as e:
        print(f"Error: {str(e)}")
        cfnresponse.send(event, context, cfnresponse.FAILED, {
            'Message': str(e)
        })
      `),
    });

    // Grant permissions to the Lambda function
    enableTransactionSearchFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
        ],
        resources: ["*"],
      })
    );

    enableTransactionSearchFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "xray:UpdateTraceSegmentDestination",
          "xray:GetTraceSegmentDestination",
          "xray:UpdateIndexingRule",
          "xray:GetIndexingRules",
        ],
        resources: ["*"],
      })
    );

    // Create custom resource provider
    const provider = new cr.Provider(this, "TransactionSearchProvider", {
      onEventHandler: enableTransactionSearchFn,
      logGroup: new logs.LogGroup(this, "TransactionSearchProviderLogs", {
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });

    // Create custom resource
    new CustomResource(this, "TransactionSearchResource", {
      serviceToken: provider.serviceToken,
      properties: {
        SamplingPercentage: samplingPercentage,
        AccountId: account,
        Region: region,
      },
    });
  }
}
