package com.amazon.settlement;

import com.amazon.settlement.model.input.Settlement;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;

public class SettlementApplicationTests {

    public void testSettlementJson() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();

        File file = new File(getClass().getResource("../../../testdata.json").getFile());
        System.out.println(file.getAbsolutePath());

        Settlement settlement = objectMapper.readValue(file, Settlement.class);
        System.out.println(settlement);
    }
    public static void main (String ... args) {
        try {
            new SettlementApplicationTests().testSettlementJson();
        }

        catch (Exception exc) {
            exc.printStackTrace();
        }
    }
}
