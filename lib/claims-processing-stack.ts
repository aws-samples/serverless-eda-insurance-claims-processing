// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  RemovalPolicy,
  Stack,
  StackProps
} from "aws-cdk-lib";
import {
  LogGroupLogDestination, RestApi
} from "aws-cdk-lib/aws-apigateway";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import {
  CloudWatchLogGroup,
  LambdaFunction
} from "aws-cdk-lib/aws-events-targets";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { ClaimsProcessingCWDashboard } from "./observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import createMetricsFunction from "./observability/cw-dashboard/infra/createMetric";
import { ClaimsService } from "./services/claims/infra/claims-service";
import { CustomerService } from "./services/customer/infra/customer-service";
import { DocumentService } from "./services/documents/infra/documents-service";
import { FraudService } from "./services/fraud/infra/fraud-service";
import { NotificationsService } from "./services/notifications/infra/notifications-service";

export class ClaimsProcessingStack extends Stack {
  lambdaFunctions: NodejsFunction[] = [];
  apis: RestApi[] = [];
  rules: string[] = [];
  stateMachines: StateMachine[] = [];

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create Custom Event Bus
    const bus = new EventBus(this, "CustomBus", {
      eventBusName: "ClaimsProcessingBus",
    });

    // Create S3 bucket for DL, Car photos, Car damage photos
    // EventBridge Rule to trigger a Step Functions on Object Created event
    const documentService = new DocumentService(this, "DocumentService", {
      bus,
    });

    const allEventsLogGroup = new LogGroup(this, "AllEventsLogGroup", {
      retention: RetentionDays.ONE_WEEK,
      logGroupName: "/aws/events/claimsProcessingEvents",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const customerService = new CustomerService(this, "CustomerService", {
      allEventsLogGroup,
      bus,
      documentsBucket: documentService.documentsBucket,
      lambdaFunctions: this.lambdaFunctions,
      apis: this.apis,
      rules: this.rules,
      stateMachines: this.stateMachines
    });
    const customerTable = customerService.customerTable;
    const policyTable = customerService.policyTable;

    const claimsService = new ClaimsService(this, "ClaimsService", {
      allEventsLogGroup,
      bus,
      customerTable,
      policyTable,
      documentsBucket: documentService.documentsBucket,
      lambdaFunctions: this.lambdaFunctions,
      apis: this.apis,
      rules: this.rules,
      stateMachines: this.stateMachines
    });
    const claimsTable = claimsService.claimsTable;
    const claimsLambdaFunction = claimsService.claimsLambdaFunction;

    const apiGWLogGroupDest = new LogGroupLogDestination(
      new LogGroup(this, "APIGWLogGroup", {
        retention: RetentionDays.ONE_WEEK,
        logGroupName: "/aws/events/claimsProcessingAPIGateway",
        removalPolicy: RemovalPolicy.DESTROY,
      })
    );

    const notificationsService = new NotificationsService(this, "NotificationsService", {
      allEventsLogGroup,
      apiGWLogGroupDest,
      bus,
      customerTable,
      eventPattern: {
        source: [
          "signup.service",
          "customer.service",
          "fnol.service",
          "claims.service",
          "document.service",
          "fraud.service",
        ],
        detailType: [
          "Customer.Submitted",
          "Customer.Accepted",
          "Customer.Rejected",
          "Claim.Requested",
          "Claim.Accepted",
          "Claim.Rejected",
          "Document.Processed",
          "Fraud.Detected"
        ]
      }
    });

    const fraudService = new FraudService(this, "FraudService", {
      bus,
      customerTable,
      policyTable,
      claimsTable
    });

    const createMetricsLambdaFunction = createMetricsFunction(this);

    // Capture all events in CW LogGroup
    new Rule(this, "AllEventLogsRule", {
      eventBus: bus,
      ruleName: "allEventLogsRule",
      eventPattern: {
        source: [
          "signup.service",
          "customer.service",
          "fnol.service",
          "claims.service",
          "document.service",
          "fraud.service",
          "aws.s3",
        ],
      },
      targets: [
        new CloudWatchLogGroup(allEventsLogGroup),
        new LambdaFunction(createMetricsLambdaFunction),
      ],
    });

    this.rules.push("FraudRule");
    this.rules.push("FnolEventsRule");
    this.rules.push("ClaimsAcceptedRule");
    this.rules.push("ClaimsRejectedRule");
    this.rules.push("DocumentsAcceptedRule");
    this.rules.push("FraudDetectedRule");
    this.rules.push("FraudNotDetectedRule");
    this.rules.push("AllEventLogsRule");

    this.stateMachines.push(documentService.documentProcessingSM);

    new ClaimsProcessingCWDashboard(this, "Claims Processing Dashboard", {
      dashboardName: "Claims-Processing-Dashboard",
      lambdaFunctions: this.lambdaFunctions,
      apis: this.apis,
      rules: this.rules,
      stateMachines: this.stateMachines,
    });
  }
}
