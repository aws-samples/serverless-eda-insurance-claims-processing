// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.services;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import com.amazon.settlement.repository.SettlementRepository;
import org.springframework.stereotype.Service;

@Service
public class SettlementService {

  private final SettlementRepository settlementRepository;

  public SettlementService(SettlementRepository settlementRepository) {
    this.settlementRepository = settlementRepository;
  }

  public SettlementResponse saveSettlement(final SettlementRequest requestCommand) {
    String settlementMessage = String.format(
      "Based on our analysis on the damage of your car per claim id %s, your out-of-pocket expense will be %s.",
      requestCommand.getClaimId(),
      "$100.00"
    );

    return settlementRepository.saveSettlement(requestCommand, settlementMessage);
  }
}
