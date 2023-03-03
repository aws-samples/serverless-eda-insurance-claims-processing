// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  CfnOutput,
  RemovalPolicy
} from "aws-cdk-lib";
import {
  AuthorizationType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  ResponseType,
  RestApi
} from "aws-cdk-lib/aws-apigateway";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import {
  CloudWatchLogGroup, SfnStateMachine, SqsQueue
} from "aws-cdk-lib/aws-events-targets";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import { EventSourceMapping, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { UpdateClaimsStepFunction } from "./step-functions/updateClaims";

interface ClaimsServiceProps {
  allEventsLogGroup: LogGroup;
  bus: EventBus;
  documentsBucket: Bucket;

  // No customer domain information should leak into claims domain.
  // These properties should not be required by Claims Service in future refactors.
  // Initial iteration is to make modular constructs work. Will define context boundaries in subsequent iterations
  policyTable: Table;
  customerTable: Table;

  lambdaFunctions: NodejsFunction[];
  apis: RestApi[];
  rules: string[];
  stateMachines: StateMachine[];
}

export class ClaimsService extends Construct {
  public readonly claimsTable: Table;
  public readonly claimsLambdaFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: ClaimsServiceProps) {
    super(scope, id);

    const bus = props.bus

    const apiGWLogGroupDest = new LogGroupLogDestination(
      new LogGroup(this, "APIGWLogGroup", {
        retention: RetentionDays.ONE_WEEK,
        logGroupName: "/aws/events/claimsProcessingAPIGateway",
        removalPolicy: RemovalPolicy.DESTROY,
      })
    );

    this.claimsTable = new Table(this, "ClaimsTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

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

    const lambdaToPutEventsPolicy = new PolicyStatement({
      actions: ["events:PutEvents"],
      resources: [bus.eventBusArn],
      effect: Effect.ALLOW,
    });

    // Create SQS for Claims Service
    const claimsQueue = new Queue(this, "ClaimsQueue", { enforceSSL: true });

    // Create FNOL Lambda function
    const firstNoticeOfLossLambda = new NodejsFunction(this, "FNOLLambda", {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: `${__dirname}/../app/handlers/fnol.js`,
      environment: {
        BUS_NAME: bus.eventBusName,
      },
    });

    firstNoticeOfLossLambda.addToRolePolicy(lambdaToPutEventsPolicy);

    // Create Claims FNOL POST API
    const fnolApi = new RestApi(this, "FnolApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["POST"],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: apiGWLogGroupDest,
      },
    });
    const fnolResource = fnolApi.root.addResource("fnol");
    fnolResource.addMethod(
      "POST",
      new LambdaIntegration(firstNoticeOfLossLambda),
      { authorizationType: AuthorizationType.IAM }
    );
    addDefaultGatewayResponse(fnolApi);
    new CfnOutput(this, "fnol-api-endpoint", {
      value: fnolApi.url,
      exportName: "fnol-api-endpoint",
    });

    // Create Claims Lambda function polling from Claims queue, accept FNOL, puts event (Claims.FNOL.Accepted) 
    // (should return a pre-signed url to upload photos of car damage)
    const claimsLambdaRole = new Role(this, "ClaimsQueueConsumerFunctionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaSQSQueueExecutionRole"
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    this.claimsLambdaFunction = new NodejsFunction(
      this,
      "ClaimsLambdaFunction",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/claimsProcessing.js`,
        role: claimsLambdaRole,
        environment: {
          BUS_NAME: bus.eventBusName,
          BUCKET_NAME: props.documentsBucket.bucketName,
          CLAIMS_TABLE_NAME: this.claimsTable.tableName,
          POLICY_TABLE_NAME: props.policyTable.tableName,
          CUSTOMER_TABLE_NAME: props.customerTable.tableName,
        },
      }
    );

    props.documentsBucket.grantWrite(this.claimsLambdaFunction);
    this.claimsTable.grantWriteData(this.claimsLambdaFunction);
    props.policyTable.grantReadData(this.claimsLambdaFunction);
    props.customerTable.grantReadData(this.claimsLambdaFunction);
    this.claimsLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);

    new EventSourceMapping(this, "ClaimsQueueFunctionESM", {
      target: this.claimsLambdaFunction,
      batchSize: 1,
      eventSourceArn: claimsQueue.queueArn,
    });

    const updateClaimsStepFunction = new UpdateClaimsStepFunction(
      this,
      "update-claims-sf",
      {
        claimsTable: this.claimsTable,
      }
    );

    // const createMetricsLambdaFunction = createMetricsFunction(this);

    /********************************************************
     ******************* EB RULES ****************************
     *********************************************************/

    // Create Event Bus Rule (Event Type: Claims.FNOL.Requested) to trigger message to SQS (Claims Queue)
    new Rule(this, "FNOLEventsRule", {
      eventBus: bus,
      ruleName: "FNOLEventsRule",
      eventPattern: {
        detailType: ["Claim.Requested"],
      },
      targets: [new SqsQueue(claimsQueue)],
    });

    // Create Rule for Claims.Accepted
    new Rule(this, "ClaimsAcceptedRule", {
      eventBus: bus,
      ruleName: "ClaimsAcceptedRule",
      eventPattern: {
        detailType: ["Claim.Accepted"],
      },
      targets: [
        // new LambdaFunction(notificationLambdaFunction)
      ],
    });

    // Claims Rejected Rule
    new Rule(this, "ClaimsRejectedRule", {
      eventBus: bus,
      ruleName: "ClaimsRejectedRule",
      eventPattern: {
        detailType: ["Claim.Rejected"],
      },
      targets: [
        // new LambdaFunction(notificationLambdaFunction)
      ],
    });

    new Rule(this, "UpdateClaimOnFraudNotDetectedRule", {
      eventBus: bus,
      ruleName: "UpdateClaimOnFraudNotDetectedRule",
      eventPattern: {
        source: ["fraud.service"],
        detailType: ["Fraud.Not.Detected"],
        detail: {
          documentType: ["CAR"],
          fraudType: ["CLAIMS"],
        },
      },
      targets: [
        new SfnStateMachine(updateClaimsStepFunction),
      ],
    });


    // Capture all events in CW LogGroup
    new Rule(this, "AllEventLogsRule", {
      eventBus: bus,
      ruleName: "allEventLogsRule",
      eventPattern: {
        source: [
          "fnol.service",
          "claims.service",
        ],
      },
      targets: [
        new CloudWatchLogGroup(props.allEventsLogGroup),
        // new LambdaFunction(createMetricsLambdaFunction),
      ],
    });

    props.lambdaFunctions.push(this.claimsLambdaFunction);
    props.lambdaFunctions.push(firstNoticeOfLossLambda);

    props.apis.push(fnolApi);

    props.rules.push("FnolEventsRule");
    props.rules.push("ClaimsAcceptedRule");
    props.rules.push("ClaimsRejectedRule");
    props.rules.push("AllEventLogsRule");

    props.stateMachines.push(updateClaimsStepFunction);

    // new ClaimsProcessingCWDashboard(this, "Claims Processing Dashboard", {
    //   dashboardName: "Claims-Processing-Dashboard",
    //   lambdaFunctions: props.lambdaFunctions,
    //   apis: props.apis,
    //   rules: props.rules,
    //   stateMachines: props.stateMachines,
    // });
  }
}
