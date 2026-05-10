package com.ibmteam02.backend_medication.medicine.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ibmteam02.backend_medication.medicine.domain.Medicine;
import com.ibmteam02.backend_medication.medicine.repository.MedicineRepository;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class MedicineService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();
    private final MedicineRepository medicineRepository;

    @Value("${public-data.service-key}")
    private String serviceKey;

    @Value("${public-data.base-url}")
    private String baseUrl;

    @Transactional
    public RefreshResult refreshMedicines() {
        URI requestUri = UriComponentsBuilder.fromUriString(baseUrl)
                .queryParam("serviceKey", serviceKey)
                .queryParam("type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 100)
                .build(true)
                .toUri();

        String response = restClient.get()
                .uri(requestUri)
                .retrieve()
                .body(String.class);

        try {
            List<Medicine> medicines = new ArrayList<>();
            JsonNode root = objectMapper.readTree(response);
            JsonNode itemsNode = root.path("body").path("items");

            JsonNode itemNode = itemsNode.path("item");
            if (itemNode.isArray()) {
                for (JsonNode node : itemNode) {
                    medicines.add(toMedicine(node));
                }
            } else if (!itemNode.isMissingNode() && !itemNode.isNull()) {
                medicines.add(toMedicine(itemNode));
            }

            medicineRepository.saveAll(medicines);
            return new RefreshResult(medicines.size());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse public medication data", e);
        }
    }

    private Medicine toMedicine(JsonNode itemNode) {
        long itemSeq = itemNode.path("itemSeq").asLong();
        String itemName = itemNode.path("itemName").asText();
        return new Medicine(itemSeq, itemName);
    }

    public record RefreshResult(int savedCount) {
    }
}
