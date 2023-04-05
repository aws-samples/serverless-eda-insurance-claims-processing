// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SettlementResponse {
  private String settlementId;
  private String customerId;
  private String claimId;
  private String settlementMessage;
}
