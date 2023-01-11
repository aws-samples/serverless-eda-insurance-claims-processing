// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CfnOutput } from "aws-cdk-lib";
import {
  AuthorizationType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export interface CustomerAPIProps {
  updateIOTPolicyFunction: NodejsFunction;
  accessLogDestination: LogGroupLogDestination;
}

export default function create_iot_api(
  scope: Construct,
  props: CustomerAPIProps
): RestApi {
  const iotAPI = new RestApi(scope, "IOTApi", {
    defaultCorsPreflightOptions: { allowOrigins: ["*"], allowMethods: ["PUT"] },
    deployOptions: {
      loggingLevel: MethodLoggingLevel.INFO,
      accessLogDestination: props.accessLogDestination,
    },
  });
  const iotPolicyResource = iotAPI.root.addResource("iotPolicy");
  iotPolicyResource.addMethod(
    "PUT",
    new LambdaIntegration(props.updateIOTPolicyFunction),
    { authorizationType: AuthorizationType.IAM }
  );
  new CfnOutput(scope, "iot-api-endpoint", {
    value: iotAPI.url,
    exportName: "iot-api-endpoint",
  });

  iotAPI.deploymentStage;

  return iotAPI;
}
