// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  aws_dynamodb as dynamodb,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_ecs_patterns as ecs_patterns,
  RemovalPolicy
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {EventBus} from "aws-cdk-lib/aws-events";
import {EventbridgeToSqs, EventbridgeToSqsProps} from "@aws-solutions-constructs/aws-eventbridge-sqs";
import {createGraphWidget, createMetric} from "../../../observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import {GraphWidget} from "aws-cdk-lib/aws-cloudwatch";

export interface SettlementServiceProps {
  readonly bus: EventBus,
  readonly settlementImageName: string;
  readonly settlementTableName: string;
  readonly settlementQueueName: string;
}

export class SettlementService extends Construct {
  public readonly settlementMetricsWidget: GraphWidget;
  constructor(scope: Construct, id: string, props: SettlementServiceProps) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, "settlement-vpc", {
      maxAzs: 3
    });

    const cluster = new ecs.Cluster(this, "settlement-cluster", {
      vpc: vpc
    });

    const table = new dynamodb.Table(this, props.settlementTableName, {
      partitionKey: {name: "Id", type: dynamodb.AttributeType.STRING,},
      tableName: props.settlementTableName,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const constructProps: EventbridgeToSqsProps = {
      existingEventBusInterface: props.bus,
      eventRuleProps: {
        eventPattern: {
          source: ["fraud.service"],
          detail: {
            documentType: ["CAR"],
            fraudType: ["CLAIMS"]
          },
          detailType: ['Fraud.Not.Detected'],
        }
      },
      queueProps: {
        queueName: props.settlementQueueName
      }
    };

    const constructStack = new EventbridgeToSqs(this, 'sqs-construct', constructProps);
    const queue = constructStack.sqsQueue;

    const queueUrl = queue.queueUrl;

    const queueProcessingFargateService = new ecs_patterns.QueueProcessingFargateService(this, 'Service', {
      cluster,
      memoryLimitMiB: 1024,
      cpu: 512,
      queue: queue,
      image: ecs.ContainerImage.fromRegistry(props.settlementImageName),
      minScalingCapacity: 1,
      maxScalingCapacity: 5,
      environment: {
        "SQS_ENDPOINT_URL": queueUrl,
        "EVENTBUS_NAME": props.bus.eventBusName,
        "DYNAMODB_TABLE_NAME": props.settlementTableName
      },
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 2,
        },
        {
          capacityProvider: 'FARGATE',
          weight: 1,
        },
      ],
    });

    const taskRole = queueProcessingFargateService.taskDefinition.taskRole;
    table.grantReadWriteData(taskRole);
    props.bus.grantPutEventsTo(taskRole);

    this.settlementMetricsWidget = createGraphWidget("Settlement Summary", [
      createMetric(
        "Settlement.Finalized",
        "settlement.service",
        "Settlement Finalized"
      )
    ]);
  }
}
