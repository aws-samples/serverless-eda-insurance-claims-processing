// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.output;

public class Settlement {
  private String message;


  // Getter Methods

  public String getMessage() {
    return message;
  }

  // Setter Methods

  public void setMessage(String message) {
    this.message = message;
  }

  @Override
  public String toString() {
    return "Settlement{" +
      "message='" + message + '\'' +
      '}';
  }
}