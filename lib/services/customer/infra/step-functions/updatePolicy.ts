// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  JsonPath,
  LogLevel,
  StateMachine,
  StateMachineType,
} from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import {
  DynamoUpdateItem,
  DynamoUpdateItemProps,
  DynamoAttributeValue,
} from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as logs from "aws-cdk-lib/aws-logs";

export interface UpdatePolicyStepFunctionProps {
  policyTable: Table;
}

export class UpdatePolicyStepFunction extends StateMachine {
  constructor(
    scope: Construct,
    id: string,
    props: UpdatePolicyStepFunctionProps
  ) {
    const logGroup = new logs.LogGroup(scope, "UpdatePolicySFLogGroup");

    const updateItemProps: DynamoUpdateItemProps = {
      table: props.policyTable,
      key: {
        PK: DynamoAttributeValue.fromString(
          JsonPath.stringAt("$.detail.recordId")
        ),
        SK: DynamoAttributeValue.fromString(
          JsonPath.stringAt("States.Format('Customer|{}', $.detail.customerId)")
        ),
      },
      updateExpression: "set validated = :validated",
      expressionAttributeValues: {
        ":validated": DynamoAttributeValue.fromBoolean(true),
      },
    };

    const first = new DynamoUpdateItem(
      scope,
      "UpdatePolicyTable",
      updateItemProps
    );

    super(scope, id, {
      definition: first,
      stateMachineType: StateMachineType.EXPRESS,
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
        includeExecutionData: true,
      },
      tracingEnabled: true,
    });
  }
}
