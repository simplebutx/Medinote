package com.ibmteam02.backend_medication.medicine.controller;

import com.ibmteam02.backend_medication.medicine.dto.ChatbotMedicineContextRequest;
import com.ibmteam02.backend_medication.medicine.dto.ChatbotMedicineContextResponse;
import com.ibmteam02.backend_medication.medicine.service.MedicineChatbotContextService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/medicines")
@RequiredArgsConstructor

// 서버간 통신 용 API
public class MedicineInternalController {

    private final MedicineChatbotContextService medicineChatbotContextService;

    // consultation(8082) -> medication(8081)
    @PostMapping("/chatbot-context")
    public ChatbotMedicineContextResponse getChatbotContext(@RequestBody ChatbotMedicineContextRequest request) {
        String medicineContext = medicineChatbotContextService.buildChatbotContext(
                request.extractedNames(),
                request.requestDetails()
        );

        // medication(8081) -> consultation(8082)
        return new ChatbotMedicineContextResponse(medicineContext);
    }
}
