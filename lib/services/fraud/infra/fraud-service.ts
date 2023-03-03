// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import {
  LambdaFunction
} from "aws-cdk-lib/aws-events-targets";
import {
  Effect, PolicyStatement
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";

interface FraudServiceProps {
  bus: EventBus;

  // Remove these properties later
  policyTable: Table;
  customerTable: Table;
  claimsTable: Table;
}

export class FraudService extends Construct {
  lambdaFunctions: NodejsFunction[] = [];
  apis: RestApi[] = [];
  rules: string[] = [];
  stateMachines: StateMachine[] = [];

  constructor(scope: Construct, id: string, props: FraudServiceProps) {
    super(scope, id);

    // Create Custom Event Bus
    const bus = props.bus;

    const lambdaToPutEventsPolicy = new PolicyStatement({
      actions: ["events:PutEvents"],
      resources: [bus.eventBusArn],
      effect: Effect.ALLOW,
    });

    // Create fraudDetection Lambda handler
    const fraudDetectorLambda = new NodejsFunction(
      this,
      "FraudDetectorLambda",
      {
        runtime: Runtime.NODEJS_18_X,
        memorySize: 512,
        logRetention: RetentionDays.ONE_WEEK,
        handler: "handler",
        entry: `${__dirname}/../app/handlers/fraudDetection.js`,
        environment: {
          BUS_NAME: bus.eventBusName,
          CUSTOMER_TABLE_NAME: props.customerTable.tableName,
          CLAIMS_TABLE_NAME: props.claimsTable.tableName,
          POLICY_TABLE_NAME: props.policyTable.tableName,
        },
      }
    );

    props.customerTable.grantReadData(fraudDetectorLambda);
    props.claimsTable.grantReadData(fraudDetectorLambda);
    props.policyTable.grantReadData(fraudDetectorLambda);

    fraudDetectorLambda.addToRolePolicy(lambdaToPutEventsPolicy);

    // const createMetricsLambdaFunction = createMetricsFunction(this);

    // Custom Event Bus Rule on *.Document.Processed event should trigger fraudDetection Lambda handler and notification handler
    const fraudRule = new Rule(this, "FraudRule", {
      eventBus: bus,
      ruleName: "FraudRule",
      eventPattern: {
        source: ["document.service"],
        detailType: ["Document.Processed"],
      },
      targets: [
        new LambdaFunction(fraudDetectorLambda)
      ],
    });

    // Custom Event Bus Rule on Claims.Fraud.Detected event should trigger notification Lambda
    // new Rule(this, "FraudDetectedRule", {
    //   eventBus: bus,
    //   ruleName: "FraudDetectedRule",
    //   eventPattern: {
    //     source: ["fraud.service"],
    //     detailType: ["Fraud.Detected"],
    //   },
    //   targets: [
    //     new LambdaFunction(claimsLambdaFunction), // Call this target if document fraud is related to claims
    //   ],
    // });

    // Custom Event Bus Rule on Claims.Fraud.Not.Detected event should trigger claims Lambda
    // new Rule(this, "FraudNotDetectedRule", {
    //   eventBus: bus,
    //   ruleName: "FraudNotDetectedRule",
    //   eventPattern: {
    //     source: ["fraud.service"],
    //     detailType: ["Fraud.Not.Detected"],
    //     detail: {
    //       documentType: ["DRIVERS_LICENSE"],
    //       fraudType: ["DOCUMENT"],
    //     },
    //   },
    //   targets: [
    //     new LambdaFunction(customerUpdateLambdaFunction), // Call this target to update customer item with latest document information
    //   ],
    // });

    // Capture all events in CW LogGroup
    new Rule(this, "AllEventLogsRule", {
      eventBus: bus,
      ruleName: "allEventLogsRule",
      eventPattern: {
        source: [
          "fraud.service",
        ],
      },
      targets: [
        // new CloudWatchLogGroup(allEventsLogGroup),
        // new LambdaFunction(createMetricsLambdaFunction),
      ],
    });

    this.lambdaFunctions.push(fraudDetectorLambda);

    this.rules.push("FraudRule");
    this.rules.push("FnolEventsRule");
    this.rules.push("ClaimsAcceptedRule");
    this.rules.push("ClaimsRejectedRule");
    this.rules.push("DocumentsAcceptedRule");
    this.rules.push("FraudDetectedRule");
    this.rules.push("FraudNotDetectedRule");
    this.rules.push("AllEventLogsRule");

    // new ClaimsProcessingCWDashboard(this, "Claims Processing Dashboard", {
    //   dashboardName: "Claims-Processing-Dashboard",
    //   lambdaFunctions: this.lambdaFunctions,
    //   apis: this.apis,
    //   rules: this.rules,
    //   stateMachines: this.stateMachines,
    // });
  }
}
