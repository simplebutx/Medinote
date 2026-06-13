package com.ibmteam02.backend_medication.smartpill.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SmartPillTestControllerTest {

    private final MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new SmartPillTestController())
            .build();

    @Test
    void healthReturnsOk() throws Exception {
        mockMvc.perform(get("/api/smartpill/test/health"))
                .andExpect(status().isOk());
    }

    @Test
    void receiveIntakeEventReturnsEchoResponse() throws Exception {
        String payload = """
                {
                  "deviceId": "smartpill-prototype-1",
                  "eventType": "PILL_TAKEN",
                  "muxPort": 3,
                  "distanceMm": 42,
                  "pillPresent": false,
                  "uptimeMs": 12345,
                  "sequence": 1
                }
                """;

        mockMvc.perform(post("/api/smartpill/test/intake-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("received"))
                .andExpect(jsonPath("$.deviceId").value("smartpill-prototype-1"))
                .andExpect(jsonPath("$.eventType").value("PILL_TAKEN"))
                .andExpect(jsonPath("$.muxPort").value(3))
                .andExpect(jsonPath("$.distanceMm").value(42))
                .andExpect(jsonPath("$.pillPresent").value(false))
                .andExpect(jsonPath("$.uptimeMs").value(12345))
                .andExpect(jsonPath("$.sequence").value(1));
    }

    @Test
    void statusReturnsLatestFourSlotState() throws Exception {
        String payload = """
                {
                  "deviceId": "smartpill-prototype-1",
                  "eventType": "BUTTON_TEST",
                  "muxPort": 3,
                  "distanceMm": 12,
                  "pillPresent": true,
                  "buttonClickCount": 3,
                  "slots": [
                    {"slotNumber": 1, "muxPort": 3, "sensorReady": true, "distanceMm": 12, "pillPresent": true},
                    {"slotNumber": 2, "muxPort": 4, "sensorReady": true, "distanceMm": 44, "pillPresent": false},
                    {"slotNumber": 3, "muxPort": 6, "sensorReady": true, "distanceMm": 16, "pillPresent": true},
                    {"slotNumber": 4, "muxPort": 7, "sensorReady": false, "distanceMm": -1, "pillPresent": false}
                  ],
                  "uptimeMs": 12345,
                  "sequence": 1
                }
                """;

        mockMvc.perform(post("/api/smartpill/test/intake-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/smartpill/test/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.buttonClickCount").value(3))
                .andExpect(jsonPath("$.slots.length()").value(4))
                .andExpect(jsonPath("$.slots[0].pillPresent").value(true))
                .andExpect(jsonPath("$.slots[1].distanceMm").value(44))
                .andExpect(jsonPath("$.slots[3].sensorReady").value(false));
    }
}
