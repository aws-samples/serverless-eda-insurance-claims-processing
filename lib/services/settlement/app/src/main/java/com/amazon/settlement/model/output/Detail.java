// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.output;

public class Detail {
  private String customerId;
  private String claimId;
  Settlement settlement;


  // Getter Methods

  public String getCustomerId() {
    return customerId;
  }

  public String getClaimId() {
    return claimId;
  }

  public Settlement getSettlement() {
    return settlement;
  }

  // Setter Methods

  public void setCustomerId(String customerId) {
    this.customerId = customerId;
  }

  public void setClaimId(String claimId) {
    this.claimId = claimId;
  }

  public void setSettlement(Settlement settlementObject) {
    this.settlement = settlementObject;
  }

  @Override
  public String toString() {
    return "Detail{" +
      "customerId='" + customerId + '\'' +
      ", claimId='" + claimId + '\'' +
      ", SettlementObject=" + settlement +
      '}';
  }
}