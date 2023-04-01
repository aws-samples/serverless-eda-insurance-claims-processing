package com.amazon.settlement.model.output;

public class Detail {
    private String customerId;
    private String claimId;
    Settlement SettlementObject;


    // Getter Methods

    public String getCustomerId() {
        return customerId;
    }

    public String getClaimId() {
        return claimId;
    }

    public Settlement getSettlement() {
        return SettlementObject;
    }

    // Setter Methods

    public void setCustomerId( String customerId ) {
        this.customerId = customerId;
    }

    public void setClaimId( String claimId ) {
        this.claimId = claimId;
    }

    public void setSettlement( Settlement settlementObject ) {
        this.SettlementObject = settlementObject;
    }

    @Override
    public String toString() {
        return "Detail{" +
                "customerId='" + customerId + '\'' +
                ", claimId='" + claimId + '\'' +
                ", SettlementObject=" + SettlementObject +
                '}';
    }
}