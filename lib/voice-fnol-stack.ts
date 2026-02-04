// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { VoiceFnolService } from "./services/voice-fnol-agent/infra/voice-fnol-service";

/**
 * Properties for the Voice FNOL Stack
 */
export interface VoiceFnolStackProps extends StackProps {
  /**
   * The FNOL API endpoint URL from the Claims Processing Stack
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
 * Voice-enabled FNOL Stack
 * 
 * This stack deploys the Voice FNOL Agent service using Amazon Bedrock AgentCore Runtime.
 * It depends on the Claims Processing Stack for the FNOL API endpoint.
 * 
 * The stack includes:
 * - Voice FNOL Agent with Amazon Nova Sonic for speech-to-speech interaction
 * - WebSocket endpoint for bidirectional audio streaming
 * - Integration with existing FNOL API
 * - CloudWatch observability with Transaction Search
 * 
 * @example
 * ```typescript
 * const voiceFnolStack = new VoiceFnolStack(app, 'VoiceFnolStack', {
 *   fnolApiEndpoint: Fn.importValue('ClaimsProcessingStack-FnolApiEndpoint'),
 *   fnolApiId: Fn.importValue('ClaimsProcessingStack-FnolApiId'),
 *   env: { account: '123456789012', region: 'us-east-1' },
 * });
 * ```
 */
export class VoiceFnolStack extends Stack {
  /**
   * The Voice FNOL Service construct
   */
  public readonly voiceFnolService: VoiceFnolService;

  constructor(scope: Construct, id: string, props: VoiceFnolStackProps) {
    super(scope, id, props);

    // Create the Voice FNOL Service
    this.voiceFnolService = new VoiceFnolService(this, "VoiceFnolService", {
      fnolApiEndpoint: props.fnolApiEndpoint,
      fnolApiId: props.fnolApiId,
      enableTransactionSearch: props.enableTransactionSearch,
      traceSamplingPercentage: props.traceSamplingPercentage,
    });

    // Stack Outputs
    new CfnOutput(this, "WebSocketEndpoint", {
      value: `wss://bedrock-agentcore.${this.region}.amazonaws.com/runtimes/${this.voiceFnolService.agentRuntime.attrAgentRuntimeArn}/ws`,
      description: "WebSocket endpoint URL for voice agent",
      exportName: `${this.stackName}-WebSocketEndpoint`,
    });

    new CfnOutput(this, "AgentRuntimeArn", {
      value: this.voiceFnolService.agentRuntime.attrAgentRuntimeArn,
      description: "AgentCore Runtime ARN",
      exportName: `${this.stackName}-AgentRuntimeArn`,
    });

    new CfnOutput(this, "AgentRuntimeId", {
      value: this.voiceFnolService.agentRuntime.ref,
      description: "AgentCore Runtime ID",
      exportName: `${this.stackName}-AgentRuntimeId`,
    });
  }
}
