package com.amazon.settlement.config;

import com.amazonaws.services.sqs.AmazonSQSAsync;
import com.amazonaws.services.sqs.AmazonSQSAsyncClientBuilder;
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

        EventBridgeClient amazonEventBridgeClient =
                EventBridgeClient.create();

        return amazonEventBridgeClient;
    }

    @Bean
    public DynamoDbClient getDynamoDbClient() {
        return DynamoDbClient.builder()
                .build();
    }
    // Amazon SQS Async
    private AmazonSQSAsync amazonSQSAsync() {

        AmazonSQSAsyncClientBuilder amazonSQSAsyncClientBuilder =
                AmazonSQSAsyncClientBuilder.standard();

        return amazonSQSAsyncClientBuilder.build();
    }


}
