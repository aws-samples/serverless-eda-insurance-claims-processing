// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CfnOutput, Fn, RemovalPolicy, Stack } from "aws-cdk-lib";
import { CfnApi, CfnChannelNamespace } from "aws-cdk-lib/aws-appsync";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, EventPattern, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface NotificationsServiceProps {
  bus: EventBus;
  eventPattern: EventPattern;
  customerTable: Table;
  userPoolId: string;
}

export class NotificationsService extends Construct {
  constructor(scope: Construct, id: string, props: NotificationsServiceProps) {
    super(scope, id);

    const bus = props.bus;
    const customerTable = props.customerTable;
    const stackName = Stack.of(this).stackName;
    const region = Stack.of(this).region;
    const account = Stack.of(this).account;

    // AppSync Events API for real-time notifications
    const eventsApi = new CfnApi(this, "NotificationsEventsApi", {
      name: `${stackName}-notifications-events`,
      eventConfig: {
        authProviders: [
          {
            authType: "AMAZON_COGNITO_USER_POOLS",
            cognitoConfig: {
              userPoolId: props.userPoolId,
              awsRegion: region,
            },
          },
          { authType: "AWS_IAM" },
        ],
        connectionAuthModes: [{ authType: "AMAZON_COGNITO_USER_POOLS" }],
        defaultPublishAuthModes: [{ authType: "AWS_IAM" }],
        defaultSubscribeAuthModes: [{ authType: "AMAZON_COGNITO_USER_POOLS" }],
      },
    });

    // Channel namespace with OnSubscribe handler to enforce per-user channels
    new CfnChannelNamespace(this, "NotificationsNamespace", {
      apiId: eventsApi.attrApiId,
      name: "notifications",
      codeHandlers: [
        "export function onSubscribe(ctx) {",
        "  const parts = ctx.info.channel.path.split('/');",
        "  const channelSub = parts[parts.length - 1];",
        "  if (channelSub !== ctx.identity.sub) {",
        "    util.unauthorized();",
        "  }",
        "}",
      ].join("\n"),
    });

    // Notification Lambda function
    const notificationLambdaFunction = new NodejsFunction(
      this,
      "NotificationLambdaFunction",
      {
        runtime: Runtime.NODEJS_22_X,
        memorySize: 512,
        logGroup: new LogGroup(this, "NotificationLambdaLogGroup", {
          retention: RetentionDays.ONE_WEEK,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
        handler: "handler",
        entry: `${__dirname}/../app/handlers/notifications.js`,
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: customerTable.tableName,
          APPSYNC_EVENTS_HTTP_DOMAIN: eventsApi.attrDnsHttp,
        },
      }
    );

    // Grant Lambda permission to publish events to AppSync Events API
    notificationLambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["appsync:EventPublish"],
        resources: [
          `arn:aws:appsync:${region}:${account}:apis/${eventsApi.attrApiId}/*`,
        ],
      })
    );

    customerTable.grantReadData(notificationLambdaFunction);

    new Rule(this, "NotificationsRule", {
      eventBus: bus,
      ruleName: "NotificationsRule",
      eventPattern: props.eventPattern,
      targets: [new LambdaFunction(notificationLambdaFunction)],
    });

    // Outputs for frontend configuration
    new CfnOutput(this, "AppSyncEventsRealtimeEndpoint", {
      value: eventsApi.attrDnsRealtime,
      description: "AppSync Events realtime endpoint for WebSocket subscriptions",
    });

    new CfnOutput(this, "AppSyncEventsHttpEndpoint", {
      value: eventsApi.attrDnsHttp,
      description: "AppSync Events HTTP endpoint for publishing",
    });
  }
}
