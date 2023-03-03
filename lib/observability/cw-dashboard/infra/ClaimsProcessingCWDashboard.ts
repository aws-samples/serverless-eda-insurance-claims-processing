// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { RestApi } from "aws-cdk-lib/aws-apigateway";
import {
  Column,
  Dashboard,
  DashboardProps,
  GraphWidget,
  IWidget,
  Metric,
  Row,
  TextWidget,
} from "aws-cdk-lib/aws-cloudwatch";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";

interface CPDashboardProps extends DashboardProps {
  lambdaFunctions: NodejsFunction[];
  apis: RestApi[];
  rules: string[];
  stateMachines: StateMachine[];
}
export class ClaimsProcessingCWDashboard extends Dashboard {
  GRAPH_HEIGHT: number = 6;
  GRAPH_WIDTH: number = 6;
  TITLE_WIDTH: number = 24;

  constructor(scope: Construct, id: string, props?: CPDashboardProps) {
    super(scope, id, props);

    const kpiTitle = new TextWidget({
      markdown: "# Key Performance Indicators",
      width: this.TITLE_WIDTH,
    });

    const kpiRow = this.createKPIRow();
    const lambdaRows = this.createLambdaRows(props?.lambdaFunctions);
    const apiRows = this.createApiRows(props?.apis);
    const eventRuleRows = this.createEventRuleRows(props?.rules);
    const stateMachinesRows = this.createSMRows(props?.stateMachines);

    this.addWidgets(
      new Column(
        ...[
          kpiTitle,
          kpiRow,
          lambdaRows,
          apiRows,
          eventRuleRows,
          stateMachinesRows,
        ]
      )
    );
  }

  createSMRows(stateMachines: StateMachine[] | undefined) {
    const smTitle = new TextWidget({
      markdown: "# State Machine Metrics",
      width: this.TITLE_WIDTH,
    });

    const smColumn = new Column(smTitle);

    if (stateMachines) {
      const durationMetrics: Metric[] = [];
      const failedMetrics: Metric[] = [];
      const executionMetrics: Metric[] = [];

      stateMachines.forEach((sm) => {
        durationMetrics.push(sm.metricTime());
        failedMetrics.push(sm.metricFailed());
        executionMetrics.push(sm.metricStarted());
      });

      smColumn.addWidget(
        this.createWideGraphWidget("Step Function - Failures", failedMetrics)
      );
      smColumn.addWidget(
        this.createWideGraphWidget("Step Function - Duration", durationMetrics)
      );
      smColumn.addWidget(
        this.createWideGraphWidget(
          "Step Function - Executions",
          executionMetrics
        )
      );
    }

    const smRow = new Row(smColumn);
    return smRow;
  }

  private createEventRuleRows(rules: string[] | undefined) {
    const eventRuleTitle = new TextWidget({
      markdown: "# Event Rule Metrics",
      width: this.TITLE_WIDTH,
    });

    const eventRuleColumn = new Column(eventRuleTitle);

    if (rules) {
      const eventRuleMetrics: Metric[] = [];
      rules.forEach((rule) => {
        eventRuleMetrics.push(
          new Metric({
            namespace: "AWS/Events",
            metricName: "Invocations",
            dimensionsMap: {
              EventBusName: "ClaimsProcessingBus",
              RuleName: rule,
            },
            label: rule,
            statistic: "Sum",
          })
        );
      });

      eventRuleColumn.addWidget(
        new GraphWidget({
          title: "Event Rule Target Invocations",
          height: this.GRAPH_HEIGHT,
          width: this.TITLE_WIDTH,
          left: eventRuleMetrics,
        })
      );
    }

    const eventRuleRow = new Row(eventRuleColumn);
    return eventRuleRow;
  }

  private createApiRows(apis: RestApi[] | undefined) {
    const apiTitle = new TextWidget({
      markdown: "# Api Gateway Metrics",
      width: this.TITLE_WIDTH,
    });

    const apiColumn = new Column(apiTitle);

    if (apis) {
      const apiMetrics: Metric[] = [];

      apis.forEach((api) => {
        apiMetrics.push(api.metricLatency());
      });

      apiColumn.addWidget(
        new GraphWidget({
          title: "API Latency",
          height: this.GRAPH_HEIGHT,
          width: this.TITLE_WIDTH,
          left: apiMetrics,
        })
      );
    }

    const apiRow = new Row(apiColumn);
    return apiRow;
  }

  private createLambdaRows(lambdaFunctions: NodejsFunction[] | undefined): Row {
    const lambdaTitle = new TextWidget({
      markdown: "# Lambda Function Metrics",
      width: this.TITLE_WIDTH,
    });

    const lambdaColumn = new Column(lambdaTitle);

    if (lambdaFunctions) {
      const durationMetrics: Metric[] = [];
      const errorMetrics: Metric[] = [];
      const invocationMetrics: Metric[] = [];

      lambdaFunctions.forEach((lambda) => {
        durationMetrics.push(lambda.metricDuration());
        errorMetrics.push(lambda.metricErrors());
        invocationMetrics.push(lambda.metricInvocations());
      });

      lambdaColumn.addWidget(
        this.createWideGraphWidget("Lambda Errors", errorMetrics)
      );
      lambdaColumn.addWidget(
        this.createWideGraphWidget("Lambda Duration", durationMetrics)
      );
      lambdaColumn.addWidget(
        this.createWideGraphWidget("Lambda Invocations", invocationMetrics)
      );
    }

    const lambdaRow = new Row(lambdaColumn);
    return lambdaRow;
  }

  private createWideGraphWidget(
    title: string,
    errorMetrics: Metric[]
  ): IWidget {
    return new GraphWidget({
      title: title,
      height: this.GRAPH_HEIGHT,
      width: this.TITLE_WIDTH,
      left: errorMetrics,
    });
  }

  private createKPIRow() {
    const claimsMetrics = [
      this.createMetric("Claim.Requested", "fnol.service", "Claims Requested"),
      this.createMetric("Claim.Accepted", "claims.service", "Claims Accepted"),
      this.createMetric("Claim.Rejected", "claims.service", "Claims Rejected"),
    ];

    const customerMetrics = [
      this.createMetric(
        "Customer.Accepted",
        "customer.service",
        "Customers Accepted"
      ),
      this.createMetric(
        "Customer.Rejected",
        "customer.service",
        "Customers Rejected"
      ),
      this.createMetric(
        "Customer.Submitted",
        "signup.service",
        "Customers Submitted"
      ),
    ];

    const fraudMetrics = [
      this.createMetric("Fraud.Detected", "fraud.service", "Fraud Detected"),
      this.createMetric(
        "Fraud.Not.Detected",
        "fraud.service",
        "Fraud Not Detected"
      ),
      this.createMetric(
        "Document.Processed",
        "document.service",
        "Documents Processed"
      ),
    ];

    const kpiRow = new Row(
      ...[
        this.createGraphWidget("Claims Summary", claimsMetrics),
        this.createGraphWidget("Customer Summary", customerMetrics),
        this.createGraphWidget("Fraud Summary", fraudMetrics),
      ]
    );
    return kpiRow;
  }

  private createGraphWidget(title: string, claimsMetrics: Metric[]) {
    return new GraphWidget({
      title: title,
      height: this.GRAPH_HEIGHT,
      width: this.GRAPH_WIDTH,
      left: claimsMetrics,
    });
  }

  private createMetric(metricName: string, service: string, label: string) {
    return new Metric({
      namespace: "ClaimsProcessing",
      metricName: metricName,
      dimensionsMap: {
        service: service,
      },
      label: label,
      statistic: "Sum",
    });
  }
}
