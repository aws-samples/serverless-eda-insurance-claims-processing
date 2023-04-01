package com.amazon.settlement.model.output;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;

public class ReturnValue {
    private String version;
    private String id;
    private String detailType;
    private String source;
    private String account;

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

    private String time;
    private String region;
    private ArrayList<Object> resources = new ArrayList<Object>();
    private Detail detailObject;


    // Getter Methods

    public String getVersion() {
        return version;
    }

    public String getId() {
        return id;
    }

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

    // Setter Methods

    public void setVersion( String version ) {
        this.version = version;
    }

    public void setId( String id ) {
        this.id = id;
    }

    @JsonProperty("detail-type")
    public void setDetailType( String detailType ) {
        this.detailType = detailType;
    }

    public void setSource( String source ) {
        this.source = source;
    }

    public void setAccount( String account ) {
        this.account = account;
    }

    public void setTime( String time ) {
        this.time = time;
    }

    public void setRegion( String region ) {
        this.region = region;
    }

    public void setDetail( Detail detailObject ) {
        this.detailObject = detailObject;
    }

    @Override
    public String toString() {
        return "ReturnValue{" +
                "version='" + version + '\'' +
                ", id='" + id + '\'' +
                ", detailType='" + detailType + '\'' +
                ", source='" + source + '\'' +
                ", account='" + account + '\'' +
                ", time='" + time + '\'' +
                ", region='" + region + '\'' +
                ", resources=" + resources +
                ", detailObject=" + detailObject +
                '}';
    }
}



