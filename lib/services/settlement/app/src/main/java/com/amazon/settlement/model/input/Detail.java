// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.input;

public class Detail {
  private String customerId;
  private String documentType;
  AnalyzedFieldAndValues analyzedFieldAndValues;
  private String recordId;
  private String fraudType;


  // Getter Methods

  public String getCustomerId() {
    return customerId;
  }

  public String getDocumentType() {
    return documentType;
  }

  public AnalyzedFieldAndValues getAnalyzedFieldAndValues() {
    return analyzedFieldAndValues;
  }

  public String getRecordId() {
    return recordId;
  }

  public String getFraudType() {
    return fraudType;
  }

  // Setter Methods

  public void setCustomerId(String customerId) {
    this.customerId = customerId;
  }

  public void setDocumentType(String documentType) {
    this.documentType = documentType;
  }

  public void setAnalyzedFieldAndValues(AnalyzedFieldAndValues analyzedFieldAndValuesObject) {
    this.analyzedFieldAndValues = analyzedFieldAndValuesObject;
  }

  public void setRecordId(String recordId) {
    this.recordId = recordId;
  }

  public void setFraudType(String fraudType) {
    this.fraudType = fraudType;
  }

  @Override
  public String toString() {
    return "Detail{" +
      "customerId='" + customerId + '\'' +
      ", documentType='" + documentType + '\'' +
      ", AnalyzedFieldAndValuesObject=" + analyzedFieldAndValues +
      ", recordId='" + recordId + '\'' +
      ", fraudType='" + fraudType + '\'' +
      '}';
  }
}