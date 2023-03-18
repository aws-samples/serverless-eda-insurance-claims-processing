// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { Metrics, MetricUnits } = require("@aws-lambda-powertools/metrics");
const metrics = new Metrics({ namespace: "ClaimsProcessing" });

exports.handler = async function (event) {
  event.Records.forEach(({ body }) => {
    const jsonBody = JSON.parse(body);

    metrics.addDimension("service", jsonBody.source);
    metrics.addMetric(jsonBody["detail-type"], MetricUnits.Count, 1);
    metrics.publishStoredMetrics();
  });
};
