// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { GraphWidget } from "aws-cdk-lib/aws-cloudwatch";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import {
  createGraphWidget,
  createMetric,
} from "../../../observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import { DocumentsEvents } from "../../documents/infra/documents-events";
import { FraudEvents } from "./fraud-events";

interface FraudServiceProps {
  bus: EventBus;

  // Remove these properties later
  policyTable: Table;
  customerTable: Table;
  claimsTable: Table;
}

export class FraudService extends Construct {
  public readonly fraudMetricsWidget: GraphWidget;

  constructor(scope: Construct, id: string, props: FraudServiceProps) {
    super(scope, id);
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

    const fraudRule = new Rule(this, "FraudRule", {
      eventBus: bus,
      ruleName: "FraudRule",
      eventPattern: {
        source: [DocumentsEvents.SOURCE],
        detailType: [DocumentsEvents.DOCUMENT_PROCESSED],
      },
      targets: [new LambdaFunction(fraudDetectorLambda)],
    });

    this.fraudMetricsWidget = createGraphWidget("Fraud Summary", [
      createMetric(
        FraudEvents.FRAUD_DETECTED,
        FraudEvents.SOURCE,
        "Fraud Detected"
      ),
      createMetric(
        FraudEvents.FRAUD_NOT_DETECTED,
        FraudEvents.SOURCE,
        "Fraud Not Detected"
      ),
    ]);
  }
}
