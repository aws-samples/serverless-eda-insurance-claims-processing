// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;

@Configuration
public class SpringCloudConfig {

  @Bean
  public EventBridgeClient eventBridgeClient() {
    return EventBridgeClient.builder()
      .httpClientBuilder(UrlConnectionHttpClient.builder())
      .build();
  }

  @Bean
  public DynamoDbClient dynamoDbClient() {
    return DynamoDbClient.builder()
      .httpClientBuilder(UrlConnectionHttpClient.builder())
      .build();
  }
}
