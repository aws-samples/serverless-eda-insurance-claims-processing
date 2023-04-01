package com.amazon.settlement.repository;

import com.amazon.settlement.model.input.Detail;
import com.amazon.settlement.model.input.Settlement;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemResponse;

import java.util.Map;

@Slf4j
@Repository
public class SettlementRepository {

    @Value("${dynamodb.table.name}")
    private String tableName;

    static Map<String, AttributeValue> attributes = Map.of(
            "customerId", AttributeValue.builder().s("customerId").build(),
            "documentType", AttributeValue.builder().s("documentType").build(),
            "recordId", AttributeValue.builder().s("recordId").build(),
            "fraudType", AttributeValue.builder().s("fraudType").build(),
            "AnalyzedFieldAndValues", AttributeValue.builder().m(Map.of(
                            "type", AttributeValue.builder().s("type").build(),
                            "Color", AttributeValue.builder().m(Map.of(
                                    "name", AttributeValue.builder().s("name").build(),
                                    "confidence", AttributeValue.builder().s("confidence").build()
                            )).build(),
                            "Damage", AttributeValue.builder().m(Map.of(
                                            "name", AttributeValue.builder().s("name").build(),
                                            "confidence", AttributeValue.builder().s("confidence").build()
                                    ))
                                    .build()
                    )
            ).build()
    );

    @Autowired
    private DynamoDbClient dynamoDbClient;

    public void storeSettlement(Settlement settlement) {

        log.info("Storing settlement detail: " + settlement.getDetail());

        PutItemRequest populateDataItemRequest = PutItemRequest.builder()
                .tableName(tableName)
                .item(attributes)
                .build();

        PutItemResponse resp = dynamoDbClient.putItem(populateDataItemRequest);
    }
}
