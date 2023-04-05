// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.repository;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemResponse;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Repository
public class SettlementRepository {

  @Value("${dynamodb.table.name}")
  private String tableName;
  private final DynamoDbClient dynamoDbClient;

  public SettlementRepository(DynamoDbClient dynamoDbClient) {
    this.dynamoDbClient = dynamoDbClient;
  }

  public SettlementResponse saveSettlement(
    final SettlementRequest requestCommand,
    final String settlementMessage
  ) {
    log.info("Storing settlement detail: " + requestCommand);

    String uuid = UUID.randomUUID().toString();

    Map<String, AttributeValue> attributes = Map.of(
      "Id", AttributeValue.builder().s(uuid).build(),
      "customerId", AttributeValue.builder().s(requestCommand.getCustomerId()).build(),
      "claimId", AttributeValue.builder().s(requestCommand.getClaimId()).build(),
      "settlementMessage", AttributeValue.builder().s(settlementMessage).build(),
      "color", AttributeValue.builder().s(requestCommand.getColor()).build(),
      "damage", AttributeValue.builder().s(requestCommand.getDamage()).build()
    );

    PutItemRequest populateDataItemRequest = PutItemRequest.builder()
      .tableName(tableName)
      .item(attributes)
      .build();

    PutItemResponse resp = dynamoDbClient.putItem(populateDataItemRequest);
    log.info("Put Item Request status code: " + resp.sdkHttpResponse().statusCode());

    return SettlementResponse.builder()
      .settlementId(uuid)
      .settlementMessage(settlementMessage)
      .customerId(requestCommand.getCustomerId())
      .claimId(requestCommand.getClaimId())
      .build();
  }
}
