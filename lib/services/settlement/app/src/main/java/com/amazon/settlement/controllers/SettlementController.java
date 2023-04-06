// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.controllers;

import com.amazon.settlement.model.SettlementRequest;
import com.amazon.settlement.model.SettlementResponse;
import com.amazon.settlement.services.SettlementService;
import org.springframework.web.bind.annotation.*;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/settlement")
public class SettlementController {
  private final SettlementService settlementService;

  public SettlementController(SettlementService settlementService) {
    this.settlementService = settlementService;
  }

  @PostMapping(produces = "application/json")
  public SettlementResponse saveSettlement(final @RequestBody SettlementRequest requestCommand) {
    return settlementService.saveSettlement(requestCommand);
  }
}
