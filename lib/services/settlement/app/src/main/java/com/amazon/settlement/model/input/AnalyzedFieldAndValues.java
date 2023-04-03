// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.input;

public class AnalyzedFieldAndValues {
  Damage damage;
  Color color;
  private String type;

  // Getter Methods

  public Damage getDamage() {
    return damage;
  }

  public Color getColor() {
    return color;
  }

  public String getType() {
    return type;
  }

  // Setter Methods

  public void setDamage(Damage damageObject) {
    this.damage = damageObject;
  }

  public void setColor(Color colorObject) {
    this.color = colorObject;
  }

  public void setType(String type) {
    this.type = type;
  }

  @Override
  public String toString() {
    return "AnalyzedFieldAndValues{" +
      "DamageObject=" + damage +
      ", ColorObject=" + color +
      ", type='" + type + '\'' +
      '}';
  }
}