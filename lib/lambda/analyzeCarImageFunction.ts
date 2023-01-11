// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import config from "../config";
import { Duration } from "aws-cdk-lib";

export interface AnalyzeCarImageFunctionProps {
  documentsBucket: Bucket;
}

export default function createAnalyzeCarImageFunction(
  scope: Construct,
  props: AnalyzeCarImageFunctionProps
): NodejsFunction {
  const analyzeCarImageFunction = new NodejsFunction(
    scope,
    "analyzeCarImageFunction",
    {
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_WEEK,
      handler: "handler",
      entry: "app/handlers/analyzeCarImage/analyzeCarImage.js",
      environment: {
        COLOR_DETECT_API: config.COLOR_DETECT_API,
        DAMAGE_DETECT_API: config.DAMAGE_DETECT_API,
      },
      timeout: Duration.seconds(30),
    }
  );

  props.documentsBucket.grantRead(analyzeCarImageFunction);

  return analyzeCarImageFunction;
}
