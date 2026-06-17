package com.ibmteam02.backend_consultation.medication.client;

import com.ibmteam02.backend_consultation.medication.dto.ChatbotMedicineContextRequest;
import com.ibmteam02.backend_consultation.medication.dto.ChatbotMedicineContextResponse;
import com.ibmteam02.backend_consultation.medication.dto.MedicationScheduleDto;
import com.ibmteam02.backend_consultation.medication.dto.UserMedicationCautionDto;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
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

    public List<MedicationScheduleDto> getPatientSchedules(Long userId) {
        return medicationRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/internal/medication-schedules")
                        .queryParam("userId", userId)
                        .build())
                .retrieve()
                .body(new ParameterizedTypeReference<List<MedicationScheduleDto>>() {});
    }

    public List<UserMedicationCautionDto> getPatientCautions(Long userId) {
        return medicationRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/internal/user-medication-cautions")
                        .queryParam("userId", userId)
                        .build())
                .retrieve()
                .body(new ParameterizedTypeReference<List<UserMedicationCautionDto>>() {});
    }
}
