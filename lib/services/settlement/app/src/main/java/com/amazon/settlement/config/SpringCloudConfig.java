// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;

@Configuration
public class SpringCloudConfig {

  @Value("${region}")
  private String AWS_REGION;

  @Bean
  public EventBridgeClient eventBridgeClient() {
    return EventBridgeClient.builder()
      .region(Region.of(AWS_REGION))
      .httpClientBuilder(UrlConnectionHttpClient.builder())
      .build();
  }

  @Bean
  public DynamoDbClient dynamoDbClient() {
    return DynamoDbClient.builder()
      .region(Region.of(AWS_REGION))
      .httpClientBuilder(UrlConnectionHttpClient.builder())
      .build();
  }
}
