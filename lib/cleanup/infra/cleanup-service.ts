// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RemovalPolicy } from "aws-cdk-lib";
import {
  AuthorizationType,
  EndpointType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

function addDefaultGatewayResponse(api: RestApi) {
  api.addGatewayResponse("default-4xx-response", {
    type: ResponseType.DEFAULT_4XX,
    responseHeaders: {
      "Access-Control-Allow-Origin": "'*'",
    },
    templates: {
      "application/json": '{"message":$context.error.messageString}',
    },
  });
}

interface CleanupServiceProps {
  customerTableName: string;
  policyTableName: string;
  claimsTableName: string;
  settlementTableName: string,
  documentsBucketName: string;
}

export class CleanupService extends Construct {
  public cleanupLambdaFunction: Function;

  constructor(scope: Construct, id: string, props: CleanupServiceProps) {
    super(scope, id);

    // Lambda Function has access to the name of the tables and bucket but it does have
    // permission to operate on those resources yet. The permissions should be given by
    // the caller construct (in this case `claims-processing-stack.ts` should be the one providing permissions)
    // Until appropriate permissions are provided, this Lambda functions will not work as expected.
    // This is an expected behavior in order to separate the concern.
    this.cleanupLambdaFunction = new NodejsFunction(
      scope,
      "ClearAllDataFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/delete.js`,
        environment: {
          CUSTOMER_TABLE_NAME: props.customerTableName,
          POLICY_TABLE_NAME: props.policyTableName,
          CLAIMS_TABLE_NAME: props.claimsTableName,
          DOCUMENT_BUCKET_NAME: props.documentsBucketName,
          SETTLEMENT_TABLE_NAME: props.settlementTableName,
        },
      }
    );

    const cleanupApiAccessLogGroupDest = new LogGroupLogDestination(
      new LogGroup(this, "CleanupApiAccessLogGroup", {
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      })
    );

    const cleanupApi = new RestApi(scope, "CleanupApi", {
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["DELETE"],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: cleanupApiAccessLogGroupDest,
      },
    });

    const clearAllDataResource = cleanupApi.root.addResource("clearAllData");

    clearAllDataResource.addMethod(
      "DELETE",
      new LambdaIntegration(this.cleanupLambdaFunction),
      { authorizationType: AuthorizationType.IAM }
    );

    addDefaultGatewayResponse(cleanupApi);
  }
}
