package com.amazon.settlement.model.input;

public class AnalyzedFieldAndValues {
    Damage DamageObject;
    Color ColorObject;
    private String type;


    // Getter Methods

    public Damage getDamage() {
        return DamageObject;
    }

    public Color getColor() {
        return ColorObject;
    }

    public String getType() {
        return type;
    }

    // Setter Methods

    public void setDamage( Damage damageObject ) {
        this.DamageObject = damageObject;
    }

    public void setColor( Color colorObject ) {
        this.ColorObject = colorObject;
    }

    public void setType( String type ) {
        this.type = type;
    }

    @Override
    public String toString() {
        return "AnalyzedFieldAndValues{" +
                "DamageObject=" + DamageObject +
                ", ColorObject=" + ColorObject +
                ", type='" + type + '\'' +
                '}';
    }
}