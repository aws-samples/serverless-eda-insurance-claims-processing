package com.amazon.settlement.service;

import com.amazon.settlement.model.input.Settlement;
import com.amazon.settlement.model.output.Detail;
import com.amazon.settlement.model.output.ReturnValue;
import com.amazon.settlement.repository.SettlementRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired
    private EventBridgeClient eventBridgeClient;

    @Autowired
    private SettlementRepository settlementRepository;

    @Value("${eventbus.name}")
    private String eventBusName;
    private ObjectMapper objectMapper = new ObjectMapper();

    @SqsListener(value = "${sqs.end-point.uri}", deletionPolicy = SqsMessageDeletionPolicy.ON_SUCCESS)
    public void receiveMessage(String message,
                               @Header("SenderId") String senderId) {
        log.info("message received {} {}", senderId, message);

        try {
            Settlement settlement = objectMapper.readValue(message, Settlement.class);

            Detail detail = new Detail();
            detail.setCustomerId(settlement.getDetail().getCustomerId());
            detail.setClaimId(settlement.getDetail().getRecordId());

            com.amazon.settlement.model.output.Settlement outputSettlement = new com.amazon.settlement.model.output.Settlement();
            outputSettlement.setMessage("Based on our analysis on the damage of your car per ${claimId}, your out of pocket cost will be $100.00.");

            detail.setSettlement(outputSettlement);

            ReturnValue returnValue = new ReturnValue();
            returnValue.setDetail(detail);

            settlementRepository.storeSettlement(settlement);

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
        } catch (JsonMappingException e) {
            throw new RuntimeException(e);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}
