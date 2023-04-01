package com.amazon.settlement.model.input;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Color {
    private String name;
    private float confidence;


    // Getter Methods

    public String getName() {
        return name;
    }

    public float getConfidence() {
        return confidence;
    }

    // Setter Methods

    @JsonProperty("Name")
    public void setName( String name ) {
        this.name = name;
    }

    @JsonProperty("Confidence")
    public void setConfidence( float confidence ) {
        this.confidence = confidence;
    }

    @Override
    public String toString() {
        return "Color{" +
                "Name='" + name + '\'' +
                ", Confidence=" + confidence +
                '}';
    }
}
