// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.config;

import org.springframework.cloud.aws.messaging.config.annotation.EnableSqs;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;

@Configuration
@EnableSqs
public class SpringCloudConfig {

  @Bean
  public EventBridgeClient amazonEventBridgeAsync() {
    return EventBridgeClient.create();
  }

  @Bean
  public DynamoDbClient getDynamoDbClient() {
    return DynamoDbClient.builder()
      .build();
  }
}
