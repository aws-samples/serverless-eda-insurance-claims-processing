// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  Stack,
  aws_eks as eks,
  aws_iam as iam,
  aws_ec2 as ec2,
  aws_ecr_assets as ecr_assets,
  ArnFormat,
  CfnOutput,
} from "aws-cdk-lib";
import { EventBus } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";
import * as path from "path";
import { KubectlV27Layer } from "@aws-cdk/lambda-layer-kubectl-v27";
import { EventbridgeToSqs } from "@aws-solutions-constructs/aws-eventbridge-sqs";
import { SettlementEvents } from "../../settlement/infra/settlement-service";
import { GraphWidget } from "aws-cdk-lib/aws-cloudwatch";
import { createGraphWidget, createMetric } from "../../../observability/cw-dashboard/infra/ClaimsProcessingCWDashboard";

export enum VendorEvents {
  SOURCE = "vendor.service",
  VENDOR_FINALIZED = "Vendor.Finalized",
}

interface VendorServiceProps {
  readonly bus: EventBus;
}

// Attach policies that are required for read access from AWS Console
function attachConsoleReadOnlyPolicies(scope: Construct, role: iam.Role) {
  role.addToPolicy(
    new iam.PolicyStatement({
      actions: [
        "eks:ListFargateProfiles",
        "eks:DescribeNodegroup",
        "eks:ListNodegroups",
        "eks:ListUpdates",
        "eks:AccessKubernetesApi",
        "eks:ListAddons",
        "eks:DescribeCluster",
        "eks:DescribeAddonVersions",
        "eks:ListClusters",
        "eks:ListIdentityProviderConfigs",
        "iam:ListRoles",
      ],
      resources: ["*"],
    })
  );
  role.addToPolicy(
    new iam.PolicyStatement({
      actions: ["ssm:GetParameter"],
      resources: [
        Stack.of(scope).formatArn({
          service: "ssm",
          resource: "parameter",
          arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
          resourceName: "*",
        }),
      ],
    })
  );
}

export class VendorService extends Construct {
  public readonly cluster: eks.Cluster;
  public readonly vendorMetricsWidget: GraphWidget;

  constructor(scope: Construct, id: string, props: VendorServiceProps) {
    super(scope, id);

    const region = Stack.of(this).region;

    const cluster = new eks.Cluster(this, "vendor-cluster", {
      clusterName: "vendor",
      version: eks.KubernetesVersion.V1_27,
      kubectlLayer: new KubectlV27Layer(this, "kubectl"),
      defaultCapacity: 2,
      outputMastersRoleArn:true,
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.AUDIT,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
        eks.ClusterLoggingTypes.SCHEDULER,
      ]
    });

    // Create a dev role which will have read-only access to AWS Console
    const devRole = new iam.Role(this, "DevRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    attachConsoleReadOnlyPolicies(this, devRole);
    cluster.awsAuth.addMastersRole(devRole);

    new CfnOutput(this, "UpdateEKSConfigWithDevRoleArn", { 
      value: `aws eks update-kubeconfig --region ${region} --name ${cluster.clusterName} --role-arn ${devRole.roleArn}` 
    });

    cluster.addNodegroupCapacity("spot-ng", {
      instanceTypes: [new ec2.InstanceType("m5.large"), new ec2.InstanceType("m5a.large")],
      minSize: 2,
      capacityType: eks.CapacityType.SPOT,
    });

    this.cluster = cluster;

    // Vendor domain defines the EB rule to trigger vendor service when a SETTLEMENT_FINALIZED event is emitted.
    const ebToSqsConstruct = new EventbridgeToSqs(this, 'sqs-construct', {
      existingEventBusInterface: props.bus,
      eventRuleProps: {
        eventPattern: {
          source: [SettlementEvents.SOURCE],
          detailType: [SettlementEvents.SETTLEMENT_FINALIZED],
        }
      },
      queueProps: {
        queueName: `${Stack.of(this).stackName}-EBTarget-VendorQueue`,
        enforceSSL: true
      }
    });

    const vendorQueue = ebToSqsConstruct.sqsQueue;

    // Vendor service runs a NodeJS Express app in docker container running inside a pod.
    const asset = new ecr_assets.DockerImageAsset(this, "image", {
      directory: path.join(__dirname, "../app"),
    });

    // Service Account is similar to execution roles in Lambda functions. They provide the pod access to other AWS services.
    const vendorServiceAccount = cluster.addServiceAccount('ServiceAccount', {
      name: "vendor-service-account"
    });
    props.bus.grantPutEventsTo(vendorServiceAccount);
    vendorQueue.grantConsumeMessages(vendorServiceAccount);

    // Creating an EKS deployment
    const deployment = cluster.addManifest("appDeployment", {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: "vendor-service" },
      spec: {
        replicas: 2,
        selector: {
          matchLabels: { app: "vendor-service" },
        },
        template: {
          metadata: {
            labels: { app: "vendor-service" },
          },
          spec: {
            serviceAccountName: vendorServiceAccount.serviceAccountName,
            containers: [
              {
                name: "vendor-service",
                image: asset.imageUri,
                ports: [{ containerPort: 3000 }],
                env: [
                  { name: "VENDOR_QUEUE_URL", value: vendorQueue.queueUrl },
                  { name: "BUS_NAME", value: props.bus.eventBusName },
                  { name: "VENDOR_EVENT_SOURCE", value: VendorEvents.SOURCE },
                  { name: "VENDOR_EVENT_TYPE", value: VendorEvents.VENDOR_FINALIZED },
                ],
              },
            ],
          },
        },
      },
    });

    deployment.node.addDependency(vendorServiceAccount);

    // Add Helm chart for KEDA.
    // Learn more about KEDA at https://keda.sh/
    const kedaHelmChart = cluster.addHelmChart('keda', {
      repository: 'https://kedacore.github.io/charts',
      chart: 'keda',
      version: '2.11.2'
    });

    // Keda expects a ScaledObject that ties the event-driven scaling of underlying EKS deployment
    // based on the scaler of your choice. In this sample, the EKS deployment scales based on the SQS queue depth.
    const kedaScaledObject = cluster.addManifest('KedaScaledObject', {
      apiVersion: 'keda.sh/v1alpha1',
      kind: 'ScaledObject',
      metadata: {
        name: 'aws-sqs-queue-scaledobject',
        namespace: 'default',
      },
      spec: {
        scaleTargetRef: {
          name: "vendor-service",
        },
        triggers: [{
          type: 'aws-sqs-queue',
          metadata: {
            queueURL: vendorQueue.queueUrl,
            queueLength: '5',
            awsRegion: region,
            identityOwner: 'pod', // Keda models after the pod's authentication role
          },
        }]
      }
    });

    kedaScaledObject.node.addDependency(kedaHelmChart);

    this.vendorMetricsWidget = createGraphWidget("Vendor Summary", [
      createMetric(
        VendorEvents.VENDOR_FINALIZED,
        VendorEvents.SOURCE,
        "Vendor Finalized"
      )
    ]);
  }
}
