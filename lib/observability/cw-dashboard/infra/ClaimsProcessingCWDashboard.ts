// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  Column,
  Dashboard,
  DashboardProps,
  GraphWidget,
  Metric,
  Row,
  TextWidget,
} from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";

const GRAPH_HEIGHT: number = 6;
const GRAPH_WIDTH: number = 6;
const TITLE_WIDTH: number = 24;

interface ClaimsProcessingDashboardProps extends DashboardProps {
  graphWidgets: GraphWidget[];
}
export class ClaimsProcessingCWDashboard extends Dashboard {
  constructor(
    scope: Construct,
    id: string,
    props: ClaimsProcessingDashboardProps
  ) {
    super(scope, id, props);

    const kpiTitle = new TextWidget({
      markdown: "# Key Business Metrics",
      width: TITLE_WIDTH,
    });

    const kpiRow = new Row(...props.graphWidgets);

    this.addWidgets(new Column(...[kpiTitle, kpiRow]));
  }
}

export function createGraphWidget(title: string, metrics: Metric[]) {
  return new GraphWidget({
    title,
    height: GRAPH_HEIGHT,
    width: GRAPH_WIDTH,
    left: metrics,
  });
}

export function createMetric(
  metricName: string,
  service: string,
  label: string
) {
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
