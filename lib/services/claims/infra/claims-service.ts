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
import { GraphWidget } from "aws-cdk-lib/aws-cloudwatch";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { SfnStateMachine, SqsQueue } from "aws-cdk-lib/aws-events-targets";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { EventSourceMapping, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import {
  createGraphWidget,
  createMetric,
} from "../../../observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import { FraudEvents } from "../../fraud/infra/fraud-events";
import { ClaimsEvents } from "./claims-events";
import { UpdateClaimsStepFunction } from "./step-functions/updateClaims";
import { CfnWebACL, CfnWebACLAssociation } from "aws-cdk-lib/aws-wafv2";

interface ClaimsServiceProps {
  bus: EventBus;
  documentsBucket: Bucket;

  // No customer domain information should leak into claims domain.
  // These properties should not be required by Claims Service in future refactors.
  // Initial iteration is to make modular constructs work. Will define context boundaries in subsequent iterations
  policyTable: Table;
  customerTable: Table;
}

export class ClaimsService extends Construct {
  public readonly claimsTable: Table;
  public readonly claimsMetricsWidget: GraphWidget;
  public readonly fnolApi: RestApi;

  constructor(scope: Construct, id: string, props: ClaimsServiceProps) {
    super(scope, id);

    const bus = props.bus;

    const apiGWLogGroupDest = new LogGroupLogDestination(
      new LogGroup(this, "APIGWLogGroup", {
        retention: RetentionDays.ONE_WEEK,
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
      runtime: Runtime.NODEJS_22_X,
      memorySize: 512,
      logGroup: new LogGroup(this, "FNOLLambdaLogGroup", {
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      handler: "handler",
      entry: `${__dirname}/../app/handlers/fnol.js`,
      environment: {
        BUS_NAME: bus.eventBusName,
      },
    });

    firstNoticeOfLossLambda.addToRolePolicy(lambdaToPutEventsPolicy);

    // Create Claims FNOL POST API
    this.fnolApi = new RestApi(this, "FnolApi", {
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["POST"],
      },
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: apiGWLogGroupDest,
      },
    });

    const fnolResource = this.fnolApi.root.addResource("fnol");
    fnolResource.addMethod(
      "POST",
      new LambdaIntegration(firstNoticeOfLossLambda),
      { authorizationType: AuthorizationType.IAM }
    );

    addDefaultGatewayResponse(this.fnolApi);
    addWebAcl(this, this.fnolApi.deploymentStage.stageArn, "FnolApiWebACL");

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

    const claimsLambdaFunction = new NodejsFunction(
      this,
      "ClaimsLambdaFunction",
      {
        runtime: Runtime.NODEJS_22_X,
        memorySize: 512,
        logGroup: new LogGroup(this, "ClaimsLambdaLogGroup", {
          retention: RetentionDays.ONE_WEEK,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
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

    props.documentsBucket.grantWrite(claimsLambdaFunction);
    this.claimsTable.grantWriteData(claimsLambdaFunction);
    props.policyTable.grantReadData(claimsLambdaFunction);
    props.customerTable.grantReadData(claimsLambdaFunction);
    claimsLambdaFunction.addToRolePolicy(lambdaToPutEventsPolicy);

    new EventSourceMapping(this, "ClaimsQueueFunctionESM", {
      target: claimsLambdaFunction,
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

    new Rule(this, "FNOLEventsRule", {
      eventBus: bus,
      ruleName: "FNOLEventsRule",
      eventPattern: {
        detailType: [ClaimsEvents.CLAIM_REQUESTED],
      },
      targets: [new SqsQueue(claimsQueue)],
    });

    new Rule(this, "UpdateClaimOnFraudNotDetectedRule", {
      eventBus: bus,
      ruleName: "UpdateClaimOnFraudNotDetectedRule",
      eventPattern: {
        source: [FraudEvents.SOURCE],
        detailType: [FraudEvents.FRAUD_NOT_DETECTED],
        detail: {
          documentType: ["CAR"],
          fraudType: ["CLAIMS"],
        },
      },
      targets: [new SfnStateMachine(updateClaimsStepFunction)],
    });

    this.claimsMetricsWidget = createGraphWidget("Claims Summary", [
      createMetric(
        ClaimsEvents.CLAIM_REQUESTED,
        ClaimsEvents.FNOL_SOURCE,
        "Claims Requested"
      ),
      createMetric(
        ClaimsEvents.CLAIM_ACCEPTED,
        ClaimsEvents.CLAIMS_SOURCE,
        "Claims Accepted"
      ),
      createMetric(
        ClaimsEvents.CLAIM_REJECTED,
        ClaimsEvents.CLAIMS_SOURCE,
        "Claims Rejected"
      ),
    ]);
  }
}

function addWebAcl(scope: Construct, stageArn: string, webAcl: string) {
  const xssWebAcl = new CfnWebACL(scope, webAcl, {
    defaultAction: { allow: {} },
    scope: "REGIONAL",
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: `MetricFor${webAcl}`
    },
    rules: [
      {
        name: "AWS-AWSManagedRulesCommonRuleSet",
        priority: 0,
        overrideAction: { none: {} },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: `MetricFor${webAcl}-CRS`
        },
        statement: {
          managedRuleGroupStatement: {
            name: "AWSManagedRulesCommonRuleSet",
            vendorName: "AWS",
          },
        },
      },
    ],
  });

  new CfnWebACLAssociation(scope, `${webAcl}Association`, {
    resourceArn: stageArn,
    webAclArn: xssWebAcl.attrArn,
  });
}
