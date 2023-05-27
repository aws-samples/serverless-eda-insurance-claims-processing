// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.services;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import com.amazon.settlement.model.input.generated.AWSEvent;
import com.amazon.settlement.model.input.generated.FraudNotDetected;
import com.amazon.settlement.model.input.generated.marshaller.Marshaller;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.awspring.cloud.sqs.annotation.SqsListener;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class SubscriberService {

  @Value("${eventbus.name}")
  private String eventBusName;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private final EventBridgeClient eventBridgeClient;

  private final SettlementService settlementService;

  public SubscriberService(EventBridgeClient eventBridgeClient, SettlementService settlementService) {
    this.eventBridgeClient = eventBridgeClient;
    this.settlementService = settlementService;
  }

  @SqsListener("${sqs.end-point.uri}")
  public void receiveMessage(String message) {
    log.info("message received {}", message);

    try {
      AWSEvent<FraudNotDetected> settlement = Marshaller.unmarshalEvent(
        new ByteArrayInputStream(message.getBytes()), FraudNotDetected.class);

      SettlementRequest request = SettlementRequest.builder()
        .customerId(settlement.getDetail().getCustomerId())
        .claimId(settlement.getDetail().getRecordId())
        .color(settlement.getDetail().getAnalyzedFieldAndValues().getColor().getName())
        .damage(settlement.getDetail().getAnalyzedFieldAndValues().getDamage().getName())
        .build();

      SettlementResponse response = settlementService.saveSettlement(request);

      String detailString = objectMapper.writeValueAsString(response);
      PutEventsRequestEntry putEventsRequestEntry = PutEventsRequestEntry.builder()
        .detail(detailString)
        .detailType("Settlement.Finalized")
        .source("settlement.service")
        .eventBusName(eventBusName)
        .build();

      List<PutEventsRequestEntry> requestEntryList = new ArrayList<>();
      requestEntryList.add(putEventsRequestEntry);

      PutEventsRequest putEventsRequest = PutEventsRequest.builder().entries(requestEntryList).build();
      log.info("Publishing Event to EventBridge custom event bus");

      PutEventsResponse resp = eventBridgeClient.putEvents(putEventsRequest);

      if (resp != null) {
        log.info("Object sent. Details: " + resp);
      }
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
