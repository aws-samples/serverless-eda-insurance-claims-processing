// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.input.generated;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serial;
import java.io.Serializable;
import java.util.Objects;

public class AnalyzedFieldAndValues implements Serializable {
  @Serial
  private static final long serialVersionUID = 1L;

  @JsonProperty("color")
  private Color color = null;

  @JsonProperty("damage")
  private Damage damage = null;

  @JsonProperty("type")
  private String type = null;

  public AnalyzedFieldAndValues color(Color color) {
    this.color = color;
    return this;
  }


  public Color getColor() {
    return color;
  }

  public void setColor(Color color) {
    this.color = color;
  }

  public AnalyzedFieldAndValues damage(Damage damage) {
    this.damage = damage;
    return this;
  }


  public Damage getDamage() {
    return damage;
  }

  public void setDamage(Damage damage) {
    this.damage = damage;
  }

  public AnalyzedFieldAndValues type(String type) {
    this.type = type;
    return this;
  }


  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  @Override
  public boolean equals(java.lang.Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    AnalyzedFieldAndValues analyzedFieldAndValues = (AnalyzedFieldAndValues) o;
    return Objects.equals(this.color, analyzedFieldAndValues.color) &&
      Objects.equals(this.damage, analyzedFieldAndValues.damage) &&
      Objects.equals(this.type, analyzedFieldAndValues.type);
  }

  @Override
  public int hashCode() {
    return java.util.Objects.hash(color, damage, type);
  }


  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("class AnalyzedFieldAndValues {\n");

    sb.append("    color: ").append(toIndentedString(color)).append("\n");
    sb.append("    damage: ").append(toIndentedString(damage)).append("\n");
    sb.append("    type: ").append(toIndentedString(type)).append("\n");
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
