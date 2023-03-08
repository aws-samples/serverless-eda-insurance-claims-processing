// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";

interface DeleteCustomerFunctionProps {
  customerTable: Table;
  policyTable: Table;
}

export default function createDeleteCustomerFunction(
  scope: Construct,
  props: DeleteCustomerFunctionProps
): NodejsFunction {
  const DeleteCustomerFunction = new NodejsFunction(scope, "DeleteCustomerFunction", {
    runtime: Runtime.NODEJS_18_X,
    memorySize: 512,
    logRetention: RetentionDays.ONE_WEEK,
    handler: "handler",
    entry: "app/handlers/customer/get.js",
    environment: {
      CUSTOMER_TABLE_NAME: props.customerTable.tableName,
      POLICY_TABLE_NAME: props.policyTable.tableName,
    },
  });

  props.customerTable.grantReadWriteData(DeleteCustomerFunction);
  props.policyTable.grantReadWriteData(DeleteCustomerFunction);

  return DeleteCustomerFunction;
}
