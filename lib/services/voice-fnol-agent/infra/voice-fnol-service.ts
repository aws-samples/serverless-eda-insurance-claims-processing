// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as bedrockagentcore from "aws-cdk-lib/aws-bedrockagentcore";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import { Construct } from "constructs";
import * as path from "path";
import { EnableTransactionSearch } from "./enable-transaction-search";

interface VoiceFnolServiceProps {
  /**
   * The FNOL API endpoint URL
   * Example: https://abc123.execute-api.us-east-1.amazonaws.com/prod/fnol
   */
  fnolApiEndpoint: string;

  /**
   * The FNOL API Gateway REST API ID for IAM permissions
   * Example: abc123def456
   */
  fnolApiId: string;

  /**
   * Enable CloudWatch Transaction Search for observability
   * This is a one-time setup per AWS account
   * 
   * @default true
   */
  enableTransactionSearch?: boolean;

  /**
   * Percentage of traces to index (1-100)
   * 1% is free tier
   * 
   * @default 1
   */
  traceSamplingPercentage?: number;
}

/**
 * Voice-enabled FNOL service using Amazon Bedrock AgentCore Runtime
 * 
 * This construct deploys a voice-enabled First Notice of Loss (FNOL) agent
 * that uses Amazon Nova 2 Sonic for speech-to-speech interaction and integrates
 * with the existing Claims Service infrastructure.
 * 
 * The service:
 * - Provides a WebSocket endpoint for bidirectional audio streaming
 * - Uses Amazon Nova Sonic model for voice conversation
 * - Integrates with existing FNOL API endpoint
 * - Runs in PUBLIC network mode (no VPC required)
 * - Implements lifecycle management with configurable timeouts
 * 
 * @example
 * ```typescript
 * const voiceFnolService = new VoiceFnolService(this, 'VoiceFnolService', {
 *   fnolApi: claimsService.fnolApi,
 * });
 * ```
 */
export class VoiceFnolService extends Construct {
  /**
   * The IAM role used by the AgentCore service
   */
  public readonly agentRole: iam.Role;

  /**
   * The AgentCore Runtime resource
   */
  public readonly agentRuntime: bedrockagentcore.CfnRuntime;

  /**
   * The AgentCore Runtime Endpoint resource
   */
  public readonly agentRuntimeEndpoint: bedrockagentcore.CfnRuntimeEndpoint;

  /**
   * The Docker image asset for the voice agent
   */
  public readonly dockerImage: ecr_assets.DockerImageAsset;

  /**
   * The WebSocket endpoint URL for the voice agent
   */
  public readonly webSocketEndpointUrl: string;

  constructor(scope: Construct, id: string, props: VoiceFnolServiceProps) {
    super(scope, id);

    const stackName = Stack.of(this).stackName;
    const region = Stack.of(this).region;
    const account = Stack.of(this).account;

    // Enable CloudWatch Transaction Search for observability (one-time setup)
    if (props.enableTransactionSearch !== false) {
      new EnableTransactionSearch(this, "EnableTransactionSearch", {
        samplingPercentage: props.traceSamplingPercentage ?? 1,
      });
    }

    // Create IAM role for AgentCore with Bedrock model access
    // Trust policy follows AgentCore documentation requirements
    this.agentRole = new iam.Role(this, "VoiceFnolAgentRole", {
      roleName: `${stackName}-VoiceFnolAgentRole`,
      assumedBy: new iam.ServicePrincipal("bedrock-agentcore.amazonaws.com", {
        conditions: {
          StringEquals: {
            "aws:SourceAccount": account,
          },
          ArnLike: {
            "aws:SourceArn": `arn:aws:bedrock-agentcore:${region}:${account}:*`,
          },
        },
      }),
      description: "IAM role for Voice FNOL AgentCore service with Bedrock and FNOL API access",
    });

    // Grant CloudWatch Logs permissions
    this.agentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:DescribeLogGroups",
        ],
        resources: [
          `arn:aws:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*`,
          `arn:aws:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*`,
        ],
      })
    );

    // Grant X-Ray tracing permissions
    this.agentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
        ],
        resources: ["*"],
      })
    );

    // Grant CloudWatch metrics permissions
    this.agentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": "bedrock-agentcore",
          },
        },
      })
    );

    // Grant Bedrock model access for Nova Sonic
    this.agentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "BedrockModelInvocation",
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [
          // Nova Sonic v2 model ARN
          `arn:aws:bedrock:${region}::foundation-model/amazon.nova-2-sonic-v1:0`,
          // Inference profile ARN (for cross-region inference)
          `arn:aws:bedrock:${region}:${account}:inference-profile/us.amazon.nova-2-sonic-v1:0`,
          // Allow all foundation models
          `arn:aws:bedrock:*::foundation-model/*`,
        ],
      })
    );

    // Grant access to existing Claims Service FNOL API endpoint
    this.agentRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [
          // Allow POST to /fnol endpoint
          `arn:aws:execute-api:${region}:${account}:${props.fnolApiId}/*/POST/fnol`,
        ],
      })
    );

    // Build and push Docker image to ECR
    // CDK will automatically:
    // 1. Build the Docker image from the Dockerfile
    // 2. Create an ECR repository if it doesn't exist
    // 3. Push the image to ECR with a content-based hash tag
    // 4. Only rebuild/push if the source code changes (content hash differs)
    // IMPORTANT: AgentCore requires ARM64 architecture
    this.dockerImage = new ecr_assets.DockerImageAsset(this, "VoiceFnolDockerImage", {
      directory: path.join(__dirname, "../"),
      platform: ecr_assets.Platform.LINUX_ARM64,
    });

    // Grant ECR permissions following AgentCore documentation
    // These must be added before creating the Runtime
    this.agentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "ECRAuthToken",
        effect: iam.Effect.ALLOW,
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      })
    );

    this.agentRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "ECRImagePull",
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability",
        ],
        resources: [
          this.dockerImage.repository.repositoryArn,
          // Also allow access to CDK asset repository pattern
          `arn:aws:ecr:${region}:${account}:repository/cdk-*`,
        ],
      })
    );

    // Environment variables for the AgentCore service
    const environment = {
      FNOL_API_ENDPOINT: props.fnolApiEndpoint,
      NOVA_SONIC_MODEL_ID: "amazon.nova-2-sonic-v1:0",
      AWS_REGION: region,
      LOG_LEVEL: "INFO",
    };

    // Create AgentCore Runtime
    this.agentRuntime = new bedrockagentcore.CfnRuntime(this, "VoiceFnolRuntime", {
      agentRuntimeName: `${stackName.replace(/-/g, '_')}_voice_fnol_agent`,
      description: "Voice-enabled FNOL agent using Amazon Nova Sonic for speech-to-speech interaction",
      roleArn: this.agentRole.roleArn,
      environmentVariables: environment,
      
      // Network configuration - PUBLIC mode (no VPC required)
      networkConfiguration: {
        networkMode: "PUBLIC",
      },

      // Agent runtime artifact - Docker image from ECR (automatically built and pushed)
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: this.dockerImage.imageUri,
        },
      },

      // Lifecycle configuration
      lifecycleConfiguration: {
        idleRuntimeSessionTimeout: 300, // 5 minutes
        maxLifetime: 3600, // 1 hour
      },

      // Protocol configuration for WebSocket
      protocolConfiguration: "HTTP",
    });

    // Ensure IAM role and policies are created before Runtime
    this.agentRuntime.node.addDependency(this.agentRole);

    // Create AgentCore Runtime Endpoint
    this.agentRuntimeEndpoint = new bedrockagentcore.CfnRuntimeEndpoint(
      this,
      "VoiceFnolRuntimeEndpoint",
      {
        name: `${stackName.replace(/-/g, '_')}_voice_fnol_endpoint`,
        agentRuntimeId: this.agentRuntime.ref,
        description: "WebSocket endpoint for voice-enabled FNOL agent",
      }
    );

    // Ensure Runtime is fully created before creating Endpoint
    this.agentRuntimeEndpoint.addDependency(this.agentRuntime);

    // Get the WebSocket endpoint URL
    this.webSocketEndpointUrl = this.agentRuntimeEndpoint.attrAgentRuntimeEndpointArn;
  }
}
