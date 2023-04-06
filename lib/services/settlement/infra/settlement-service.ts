// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  aws_dynamodb as dynamodb,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_iam as iam,
  aws_ecs_patterns as ecs_patterns, Duration,
  RemovalPolicy, CfnOutput
} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {EventBus} from "aws-cdk-lib/aws-events";
import {EventbridgeToSqs, EventbridgeToSqsProps} from "@aws-solutions-constructs/aws-eventbridge-sqs";
import {createGraphWidget, createMetric} from "../../../observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";
import {GraphWidget} from "aws-cdk-lib/aws-cloudwatch";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationProtocolVersion
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {Peer, Port, SecurityGroup} from "aws-cdk-lib/aws-ec2";
import { LogGroup } from 'aws-cdk-lib/aws-logs';

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

    const taskRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        "ecs:DescribeTasks",
        "ecs:ListTasks"
      ]
    });

    const executionRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        "logs:CreateLogGroup",
        "logs:DescribeLogStreams",
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:PutLogEvents",
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets",
        "xray:GetSamplingStatisticSummaries",
        'ssm:GetParameters'
      ]
    });

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

    const taskRole = new iam.Role(this, "settlement-taskRole", {
      roleName: "settlement-taskRole",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
    });

    taskRole.addToPolicy(taskRolePolicy);

    const taskDef = new ecs.FargateTaskDefinition(this, "spring-demo-taskdef", {
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },
      taskRole: taskRole,
      cpu: 1024,
      memoryLimitMiB: 2048
    });

    taskDef.addToExecutionRolePolicy(executionRolePolicy);

    const logging = new ecs.AwsLogDriver({
      streamPrefix: "settlement-service",
      logGroup: LogGroup.fromLogGroupName(this, "settlement-loggroup" ,"/aws/events/settlement")
    })

    const container = taskDef.addContainer("settlement-service", {
      image: ecs.ContainerImage.fromRegistry(props.settlementImageName),
      memoryLimitMiB: 1024,
      cpu: 512,
      logging,
      environment: {
        "SQS_ENDPOINT_URL": queueUrl,
        "EVENTBUS_NAME": props.bus.eventBusName,
        "DYNAMODB_TABLE_NAME": props.settlementTableName
      }
    });

    container.addPortMappings({
      containerPort: 8080,
      hostPort: 8080,
      protocol: ecs.Protocol.TCP
    });

    const loadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "settlement-service", {
      cluster: cluster,
      taskDefinition: taskDef,
      publicLoadBalancer: true,
      desiredCount: 2,
      listenerPort: 8080
    });

    loadBalancedFargateService.targetGroup.configureHealthCheck({
      path: "/actuator/health"
    });

    const scaling = loadBalancedFargateService.service.autoScaleTaskCount({ maxCapacity: 6, minCapacity: 2 });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 50,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60)
    });

    table.grantReadWriteData(taskRole);
    props.bus.grantPutEventsTo(taskRole);
    queue.grantConsumeMessages(taskRole);

    new CfnOutput(this, "EventBridge: ", { value: props.bus.eventBusName });
    new CfnOutput(this, "SQS-Queue: ", { value: queue.queueName });

    this.settlementMetricsWidget = createGraphWidget("Settlement Summary", [
      createMetric(
        "Settlement.Finalized",
        "settlement.service",
        "Settlement Finalized"
      )
    ]);
  }
}
