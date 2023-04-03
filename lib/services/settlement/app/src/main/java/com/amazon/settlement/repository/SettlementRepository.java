// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.repository;

import com.amazon.settlement.model.input.AnalyzedFieldAndValues;
import com.amazon.settlement.model.input.Detail;
import com.amazon.settlement.model.input.Settlement;
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

  public void storeSettlement(final Settlement settlement, final String settlementMessage) {
    log.info("Storing settlement detail: " + settlement.getDetail());
    Detail detail = settlement.getDetail();
    AnalyzedFieldAndValues analyzedFieldAndValues = detail.getAnalyzedFieldAndValues();

    Map<String, AttributeValue> attributes = Map.of(
      "Id", AttributeValue.builder().s(UUID.randomUUID().toString()).build(),
      "customerId", AttributeValue.builder().s(detail.getCustomerId()).build(),
      "settlementMessage", AttributeValue.builder().s(settlementMessage).build(),
      "detailType", AttributeValue.builder().s(settlement.getDetailType()).build(),
      "documentType", AttributeValue.builder().s(detail.getDocumentType()).build(),
      "recordId", AttributeValue.builder().s(detail.getRecordId()).build(),
      "fraudType", AttributeValue.builder().s(detail.getFraudType()).build(),
      "AnalyzedFieldAndValues", AttributeValue.builder().m(Map.of(
          "type", AttributeValue.builder().s(analyzedFieldAndValues.getType()).build(),
          "Color", AttributeValue.builder().m(Map.of(
            "name", AttributeValue.builder().s(analyzedFieldAndValues.getColor().getName()).build(),
            "confidence", AttributeValue.builder().s(String.valueOf(analyzedFieldAndValues.getColor().getConfidence())).build()
          )).build(),
          "Damage", AttributeValue.builder().m(Map.of(
              "name", AttributeValue.builder().s(analyzedFieldAndValues.getDamage().getName()).build(),
              "confidence", AttributeValue.builder().s(String.valueOf(analyzedFieldAndValues.getDamage().getConfidence())).build()
            ))
            .build()
        )
      ).build()
    );

    PutItemRequest populateDataItemRequest = PutItemRequest.builder()
      .tableName(tableName)
      .item(attributes)
      .build();

    PutItemResponse resp = dynamoDbClient.putItem(populateDataItemRequest);

    log.info("Put Item Request status code: " + resp.sdkHttpResponse().statusCode());
  }
}
