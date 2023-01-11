// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CfnOutput } from "aws-cdk-lib";
import {
  AuthorizationType,
  LambdaIntegration,
  RestApi,
  MethodLoggingLevel,
  LogGroupLogDestination,
} from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export interface CustomerAPIProps {
  getCustomerFunction: NodejsFunction;
  accessLogDestination: LogGroupLogDestination;
}

export default function createCustomerAPI(
  scope: Construct,
  props: CustomerAPIProps
): RestApi {
  const customerAPI = new RestApi(scope, "CustomerApi", {
    defaultCorsPreflightOptions: { allowOrigins: ["*"], allowMethods: ["GET"] },
    deployOptions: {
      loggingLevel: MethodLoggingLevel.INFO,
      accessLogDestination: props.accessLogDestination,
    },
  });
  const customerResource = customerAPI.root.addResource("customer");
  customerResource.addMethod(
    "GET",
    new LambdaIntegration(props.getCustomerFunction),
    { authorizationType: AuthorizationType.IAM }
  );
  new CfnOutput(scope, "customer-api-endpoint", {
    value: customerAPI.url,
    exportName: "customer-api-endpoint",
  });
  return customerAPI;
}
