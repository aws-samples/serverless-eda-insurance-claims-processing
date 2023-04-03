// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.input;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;

public class Settlement {
  private String version;
  private String id;
  private String detailType;
  private String source;
  private String account;
  private String time;
  private String region;
  private ArrayList<Object> resources = new ArrayList<Object>();
  Detail detailObject;

  public ArrayList<Object> getResources() {
    return resources;
  }

  public void setResources(ArrayList<Object> resources) {
    this.resources = resources;
  }

  public Detail getDetailObject() {
    return detailObject;
  }

  public void setDetailObject(Detail detailObject) {
    this.detailObject = detailObject;
  }

  public String getVersion() {
    return version;
  }

  public String getId() {
    return id;
  }

  @JsonProperty("detail-type")
  public String getDetailType() {
    return detailType;
  }

  public String getSource() {
    return source;
  }

  public String getAccount() {
    return account;
  }

  public String getTime() {
    return time;
  }

  public String getRegion() {
    return region;
  }

  public Detail getDetail() {
    return detailObject;
  }

  public void setVersion(String version) {
    this.version = version;
  }

  public void setId(String id) {
    this.id = id;
  }

  public void setDetailType(String detailType) {
    this.detailType = detailType;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public void setAccount(String account) {
    this.account = account;
  }

  public void setTime(String time) {
    this.time = time;
  }

  public void setRegion(String region) {
    this.region = region;
  }

  public void setDetail(Detail detailObject) {
    this.detailObject = detailObject;
  }

  @Override
  public String toString() {
    return "Settlement{" +
      "version='" + version + '\'' +
      ", id='" + id + '\'' +
      ", detailType='" + detailType + '\'' +
      ", source='" + source + '\'' +
      ", account='" + account + '\'' +
      ", time='" + time + '\'' +
      ", region='" + region + '\'' +
      ", DetailObject=" + detailObject +
      '}';
  }
}


