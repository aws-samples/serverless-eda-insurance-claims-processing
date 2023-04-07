// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.input.generated;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serial;
import java.io.Serializable;
import java.util.Objects;

public class FraudNotDetected implements Serializable {
  @Serial
  private static final long serialVersionUID = 1L;

  @JsonProperty("analyzedFieldAndValues")
  private AnalyzedFieldAndValues analyzedFieldAndValues = null;

  @JsonProperty("customerId")
  private String customerId = null;

  @JsonProperty("documentType")
  private String documentType = null;

  @JsonProperty("fraudType")
  private String fraudType = null;

  @JsonProperty("recordId")
  private String recordId = null;

  public FraudNotDetected analyzedFieldAndValues(AnalyzedFieldAndValues analyzedFieldAndValues) {
    this.analyzedFieldAndValues = analyzedFieldAndValues;
    return this;
  }


  public AnalyzedFieldAndValues getAnalyzedFieldAndValues() {
    return analyzedFieldAndValues;
  }

  public void setAnalyzedFieldAndValues(AnalyzedFieldAndValues analyzedFieldAndValues) {
    this.analyzedFieldAndValues = analyzedFieldAndValues;
  }

  public FraudNotDetected customerId(String customerId) {
    this.customerId = customerId;
    return this;
  }


  public String getCustomerId() {
    return customerId;
  }

  public void setCustomerId(String customerId) {
    this.customerId = customerId;
  }

  public FraudNotDetected documentType(String documentType) {
    this.documentType = documentType;
    return this;
  }


  public String getDocumentType() {
    return documentType;
  }

  public void setDocumentType(String documentType) {
    this.documentType = documentType;
  }

  public FraudNotDetected fraudType(String fraudType) {
    this.fraudType = fraudType;
    return this;
  }


  public String getFraudType() {
    return fraudType;
  }

  public void setFraudType(String fraudType) {
    this.fraudType = fraudType;
  }

  public FraudNotDetected recordId(String recordId) {
    this.recordId = recordId;
    return this;
  }


  public String getRecordId() {
    return recordId;
  }

  public void setRecordId(String recordId) {
    this.recordId = recordId;
  }

  @Override
  public boolean equals(java.lang.Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    FraudNotDetected fraudNotDetected = (FraudNotDetected) o;
    return Objects.equals(this.analyzedFieldAndValues, fraudNotDetected.analyzedFieldAndValues) &&
      Objects.equals(this.customerId, fraudNotDetected.customerId) &&
      Objects.equals(this.documentType, fraudNotDetected.documentType) &&
      Objects.equals(this.fraudType, fraudNotDetected.fraudType) &&
      Objects.equals(this.recordId, fraudNotDetected.recordId);
  }

  @Override
  public int hashCode() {
    return java.util.Objects.hash(analyzedFieldAndValues, customerId, documentType, fraudType, recordId);
  }


  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class Fraud_Not_Detected {\n");

    sb.append("    analyzedFieldAndValues: ").append(toIndentedString(analyzedFieldAndValues)).append("\n");
    sb.append("    customerId: ").append(toIndentedString(customerId)).append("\n");
    sb.append("    documentType: ").append(toIndentedString(documentType)).append("\n");
    sb.append("    fraudType: ").append(toIndentedString(fraudType)).append("\n");
    sb.append("    recordId: ").append(toIndentedString(recordId)).append("\n");
    sb.append("}");
    return sb.toString();
  }

  private String toIndentedString(java.lang.Object o) {
    if (o == null) {
      return "null";
    }
    return o.toString().replace("\n", "\n    ");
  }

}
