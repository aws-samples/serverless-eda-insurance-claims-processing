// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  aws_dynamodb as dynamodb,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_ecs_patterns as ecs_patterns,
  CfnOutput,
  Duration,
  RemovalPolicy
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EventBus } from "aws-cdk-lib/aws-events";
import { EventbridgeToSqs, EventbridgeToSqsProps } from "@aws-solutions-constructs/aws-eventbridge-sqs";
import { createGraphWidget, createMetric } from "../../../observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import { GraphWidget } from "aws-cdk-lib/aws-cloudwatch";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { FraudEvents } from "../../fraud/infra/fraud-events";

export enum SettlementEvents {
  SOURCE = "settlement.service",
  SETTLEMENT_FINALIZED = "Settlement.Finalized",
}

interface SettlementServiceProps {
  readonly bus: EventBus,
  readonly settlementImageName: string;
  readonly settlementTableName: string;
  readonly settlementQueueName: string;
}

export class SettlementService extends Construct {
  public readonly table: dynamodb.Table;
  public readonly settlementMetricsWidget: GraphWidget;

  constructor(scope: Construct, id: string, props: SettlementServiceProps) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, "settlement-vpc", {
      maxAzs: 3
    });

    const cluster = new ecs.Cluster(this, "settlement-cluster", {
      vpc: vpc
    });

    this.table = new dynamodb.Table(this, props.settlementTableName, {
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
          source: [FraudEvents.SOURCE],
          detail: {
            documentType: ["CAR"],
            fraudType: ["CLAIMS"]
          },
          detailType: [FraudEvents.FRAUD_NOT_DETECTED],
        }
      },
      queueProps: {
        queueName: props.settlementQueueName
      }
    };

    const constructStack = new EventbridgeToSqs(this, 'sqs-construct', constructProps);
    const queue = constructStack.sqsQueue;

    const loadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "settlement-service",
      {
        cluster: cluster,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry(props.settlementImageName),
          environment: {
            "SQS_ENDPOINT_URL": queue.queueUrl,
            "EVENTBUS_NAME": props.bus.eventBusName,
            "DYNAMODB_TABLE_NAME": props.settlementTableName
          },
          containerPort: 8080,
          logDriver: new ecs.AwsLogDriver({
            streamPrefix: "settlement-service",
            mode: ecs.AwsLogDriverMode.NON_BLOCKING,
            logRetention: RetentionDays.FIVE_DAYS,
          })
        },
        memoryLimitMiB: 2048,
        cpu: 1024,
        publicLoadBalancer: true,
        desiredCount: 2,
        listenerPort: 8080
      });

    this.table.grantReadWriteData(loadBalancedFargateService.taskDefinition.taskRole);
    props.bus.grantPutEventsTo(loadBalancedFargateService.taskDefinition.taskRole);
    queue.grantConsumeMessages(loadBalancedFargateService.taskDefinition.taskRole);

    loadBalancedFargateService.targetGroup.configureHealthCheck({
      path: "/actuator/health"
    });

    const scaling = loadBalancedFargateService.service.autoScaleTaskCount({maxCapacity: 6, minCapacity: 2});
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 50,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60)
    });

    new CfnOutput(this, "EventBridge: ", {value: props.bus.eventBusName});
    new CfnOutput(this, "SQS-Queue: ", {value: queue.queueName});

    this.settlementMetricsWidget = createGraphWidget("Settlement Summary", [
      createMetric(
        "Settlement.Finalized",
        "settlement.service",
        "Settlement Finalized"
      )
    ]);
  }
}
