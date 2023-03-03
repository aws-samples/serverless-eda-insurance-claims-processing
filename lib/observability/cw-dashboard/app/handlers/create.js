// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { Metrics, MetricUnits } = require("@aws-lambda-powertools/metrics");
const metrics = new Metrics({ namespace: "ClaimsProcessing" });

exports.handler = async function (event, context) {
  console.log("event = ", event);
  metrics.addDimension("service", event.source);
  metrics.addMetric(event["detail-type"], MetricUnits.Count, 1);
  metrics.publishStoredMetrics();
};
