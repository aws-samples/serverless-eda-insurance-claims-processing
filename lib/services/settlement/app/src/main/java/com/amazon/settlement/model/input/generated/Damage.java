// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.input.generated;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serial;
import java.io.Serializable;
import java.util.Objects;

public class Damage implements Serializable {
  @Serial
  private static final long serialVersionUID = 1L;

  @JsonProperty("Confidence")
  private Double confidence = null;

  @JsonProperty("Name")
  private String name = null;

  public Damage confidence(Double confidence) {
    this.confidence = confidence;
    return this;
  }


  public Double getConfidence() {
    return confidence;
  }

  public void setConfidence(Double confidence) {
    this.confidence = confidence;
  }

  public Damage name(String name) {
    this.name = name;
    return this;
  }


  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  @Override
  public boolean equals(java.lang.Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    Damage damage = (Damage) o;
    return Objects.equals(this.confidence, damage.confidence) &&
      Objects.equals(this.name, damage.name);
  }

  @Override
  public int hashCode() {
    return java.util.Objects.hash(confidence, name);
  }


  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class Damage {\n");

    sb.append("    confidence: ").append(toIndentedString(confidence)).append("\n");
    sb.append("    name: ").append(toIndentedString(name)).append("\n");
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
