package com.ibmteam02.backend_consultation.medication.client;

import com.ibmteam02.backend_consultation.medication.dto.ChatbotMedicineContextRequest;
import com.ibmteam02.backend_consultation.medication.dto.ChatbotMedicineContextResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor

// consultation(8082) -> medication(8081) 요청용 restClient
public class MedicationClient {

    private final RestClient medicationRestClient;

    public ChatbotMedicineContextResponse getChatbotContext(ChatbotMedicineContextRequest request) {
        return medicationRestClient.post()
                .uri("/api/internal/medicines/chatbot-context")
                .body(request)
                .retrieve()
                .body(ChatbotMedicineContextResponse.class);
    }
}
