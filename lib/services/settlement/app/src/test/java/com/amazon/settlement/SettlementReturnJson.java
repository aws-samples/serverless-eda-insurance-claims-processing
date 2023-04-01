package com.amazon.settlement;

import com.amazon.settlement.model.output.ReturnValue;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;

public class SettlementReturnJson {
    public void testSettlementReturnJson() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();

        File file = new File(getClass().getResource("../../../testreturndata.json").getFile());
        System.out.println(file.getAbsolutePath());

        ReturnValue returnValue = objectMapper.readValue(file, ReturnValue.class);
        System.out.println(returnValue);
    }
    public static void main (String ... args) {
        try {
            new SettlementReturnJson().testSettlementReturnJson();
        }

        catch (Exception exc) {
            exc.printStackTrace();
        }
    }
}
