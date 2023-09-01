// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { DefinitionBody, JsonPath, LogLevel, StateMachine, StateMachineType, } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { DynamoAttributeValue, DynamoUpdateItem, DynamoUpdateItemProps, } from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as logs from "aws-cdk-lib/aws-logs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { RemovalPolicy } from "aws-cdk-lib";

export interface UpdateClaimsStepFunctionProps {
  claimsTable: Table;
}

export class UpdateClaimsStepFunction extends StateMachine {
  constructor(
    scope: Construct,
    id: string,
    props: UpdateClaimsStepFunctionProps
  ) {
    const logGroup = new logs.LogGroup(scope, "UpdateClaimsSFLogGroup", {
      logGroupName: "/aws/vendedlogs/states/UpdateClaimsSFN",
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.FIVE_DAYS
    });

    const updateItemProps: DynamoUpdateItemProps = {
      table: props.claimsTable,
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
      "UpdateClaimsTable",
      updateItemProps
    );

    super(scope, id, {
      definitionBody: DefinitionBody.fromChainable(first),
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
