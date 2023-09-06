// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import {
  AuthorizationType,
  EndpointType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  ResponseType,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, EventPattern, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnPolicy } from "aws-cdk-lib/aws-iot";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

interface NotificationsServiceProps {
  bus: EventBus;
  eventPattern: EventPattern;

  // No other domain's information should leak into notifications domain.
  // These properties should not be required by Notifications Service in future refactors.
  // Initial iteration is to make modular constructs work. Will define context boundaries in subsequent iterations
  customerTable: Table;
}

function create_iot_policy(scope: Construct): CfnPolicy {
  return new CfnPolicy(scope, "IOT_POLICY", {
    policyName: `${Stack.of(scope).stackName}_IOT_POLICY`,
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
  });
}

export class NotificationsService extends Construct {
  constructor(scope: Construct, id: string, props: NotificationsServiceProps) {
    super(scope, id);

    const bus = props.bus;
    const customerTable = props.customerTable;

    const lambdaToPublishIoTEventsPolicy = new PolicyStatement({
      actions: ["iot:Publish"],
      resources: [
        "arn:aws:iot:" +
        process.env.CDK_DEFAULT_REGION +
        ":" +
        process.env.CDK_DEFAULT_ACCOUNT +
        ":*",
      ],
      effect: Effect.ALLOW,
    });

    const iotPolicy = create_iot_policy(this);

    // Create Notifications Lambda function (needs IoT support)
    const notificationLambdaFunction = new NodejsFunction(
      this,
      "NotificationLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/notifications.js`,
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: customerTable.tableName,
        },
      }
    );
    notificationLambdaFunction.addToRolePolicy(lambdaToPublishIoTEventsPolicy);
    customerTable.grantReadData(notificationLambdaFunction);

    const addDefaultGatewayResponse = function (api: RestApi) {
      api.addGatewayResponse("default-4xx-response", {
        type: ResponseType.DEFAULT_4XX,
        responseHeaders: {
          "Access-Control-Allow-Origin": "'*'",
        },
        templates: {
          "application/json": '{"message":$context.error.messageString}',
        },
      });
    };

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
        entry: `${__dirname}/../app/handlers/iot.index.js`,
        environment: {
          IOT_POLICY_NAME: iotPolicy.policyName as string,
        },
      }
    );

    updateIOTPolicyFunction.addToRolePolicy(attachPolicyStatement);

    const iotApiGWLogGroupDest = new LogGroupLogDestination(
      new LogGroup(this, "IoTAPIGWAccessLogGroup", {
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      })
    );

    const iotAPI = new RestApi(scope, "IOTApi", {
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["PUT"],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: iotApiGWLogGroupDest,
      },
    });
    const iotPolicyResource = iotAPI.root.addResource("iotPolicy");
    iotPolicyResource.addMethod(
      "PUT",
      new LambdaIntegration(updateIOTPolicyFunction),
      { authorizationType: AuthorizationType.IAM }
    );

    addDefaultGatewayResponse(iotAPI);

    const getIoTEndpoint = new AwsCustomResource(this, "IoTEndpoint", {
      onCreate: {
        service: "Iot",
        action: "describeEndpoint",
        physicalResourceId: PhysicalResourceId.fromResponse("endpointAddress"),
        parameters: {
          endpointType: "iot:Data-ATS",
        },
      },
      onUpdate: {
        service: "Iot",
        action: "describeEndpoint",
        parameters: {
          endpointType: "iot:Data-ATS",
        },
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    const iot_endpoint_address =
      getIoTEndpoint.getResponseField("endpointAddress");

    new CfnOutput(this, "iot-endpoint-address", {
      value: iot_endpoint_address,
    });

    new Rule(this, "NotificationsRule", {
      eventBus: bus,
      ruleName: "NotificationsRule",
      eventPattern: props.eventPattern,
      targets: [new LambdaFunction(notificationLambdaFunction)],
    });
  }
}
