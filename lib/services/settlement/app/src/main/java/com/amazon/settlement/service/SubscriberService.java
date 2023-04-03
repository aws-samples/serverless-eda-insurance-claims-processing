// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.service;

import com.amazon.settlement.model.input.Settlement;
import com.amazon.settlement.model.output.Detail;
import com.amazon.settlement.model.output.ReturnValue;
import com.amazon.settlement.repository.SettlementRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.aws.messaging.listener.SqsMessageDeletionPolicy;
import org.springframework.cloud.aws.messaging.listener.annotation.SqsListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.eventbridge.EventBridgeClient;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequest;
import software.amazon.awssdk.services.eventbridge.model.PutEventsRequestEntry;
import software.amazon.awssdk.services.eventbridge.model.PutEventsResponse;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class SubscriberService {

  @Value("${eventbus.name}")
  private String eventBusName;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private final EventBridgeClient eventBridgeClient;

  private final SettlementRepository settlementRepository;

  public SubscriberService(EventBridgeClient eventBridgeClient, SettlementRepository settlementRepository) {
    this.eventBridgeClient = eventBridgeClient;
    this.settlementRepository = settlementRepository;
  }

  @SqsListener(value = "${sqs.end-point.uri}", deletionPolicy = SqsMessageDeletionPolicy.ON_SUCCESS)
  public void receiveMessage(String message, @Header("SenderId") String senderId) {
    log.info("message received {} {}", senderId, message);

    try {
      Settlement settlement = objectMapper.readValue(message, Settlement.class);

      Detail detail = new Detail();
      detail.setCustomerId(settlement.getDetail().getCustomerId());
      detail.setClaimId(settlement.getDetail().getRecordId());

      com.amazon.settlement.model.output.Settlement outputSettlement = new com.amazon.settlement.model.output.Settlement();
      outputSettlement.setMessage(
        String.format(
          "Based on our analysis on the damage of your car per claim id %s, your out-of-pocket expense will be %s.",
          settlement.getDetail().getRecordId(),
          "$100.00"
        )
      );

      detail.setSettlement(outputSettlement);

      ReturnValue returnValue = new ReturnValue();
      returnValue.setDetail(detail);

      settlementRepository.storeSettlement(settlement, outputSettlement.getMessage());

      String detailString = objectMapper.writeValueAsString(detail);
      PutEventsRequestEntry putEventsRequestEntry = PutEventsRequestEntry.builder()
        .detail(detailString)
        .detailType("Settlement.Finalized")
        .source("settlement.service")
        .eventBusName(eventBusName)
        .build();

      List<PutEventsRequestEntry> requestEntryList = new ArrayList<>();
      requestEntryList.add(putEventsRequestEntry);

      PutEventsRequest putEventsRequest = PutEventsRequest.builder().entries(requestEntryList).build();
      PutEventsResponse resp = eventBridgeClient.putEvents(putEventsRequest);

      if (resp != null) {
        log.info("Object sent. Details: " + resp);
      }
    } catch (JsonProcessingException e) {
      throw new RuntimeException(e);
    }
  }
}
