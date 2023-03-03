// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { Metrics, MetricUnits } = require("@aws-lambda-powertools/metrics");
const metrics = new Metrics({ namespace: "ClaimsProcessing" });

exports.handler = async function (event) {
  event.Records.forEach(({ body }) => {
    metrics.addDimension("service", body.source);
    metrics.addMetric(body["detail-type"], MetricUnits.Count, 1);
    metrics.publishStoredMetrics();
  });
};
