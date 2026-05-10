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
        List<Medicine> medicines = new ArrayList<>();
        int pageNo = 1;
        int numOfRows = 100;
        int totalCount = Integer.MAX_VALUE;

        while ((pageNo - 1) * numOfRows < totalCount) {
            PublicDataPage publicDataPage = fetchPublicDataPage(pageNo, numOfRows);
            medicines.addAll(publicDataPage.items());

            if (publicDataPage.items().isEmpty()) {
                break;
            }

            totalCount = publicDataPage.totalCount();
            pageNo++;
        }

        medicineRepository.saveAll(medicines);

        return new RefreshResult(medicines.size());
    }

    private PublicDataPage fetchPublicDataPage(int pageNo, int numOfRows) {
        URI requestUri = UriComponentsBuilder.fromUriString(baseUrl)
                .queryParam("serviceKey", serviceKey)
                .queryParam("type", "json")
                .queryParam("pageNo", pageNo)
                .queryParam("numOfRows", numOfRows)
                .build(true)
                .toUri();

        String response = restClient.get()
                .uri(requestUri)
                .retrieve()
                .body(String.class);

        return extractMedicines(response);
    }

    private PublicDataPage extractMedicines(String response) {
        List<Medicine> medicines = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(response);
            JsonNode bodyNode = root.path("body");
            int totalCount = bodyNode.path("totalCount").asInt(0);
            JsonNode itemsNode = root.path("body").path("items");

            if (itemsNode.isArray()) {
                for (JsonNode itemNode : itemsNode) {
                    medicines.add(toMedicine(itemNode));
                }
                return new PublicDataPage(medicines, totalCount);
            }

            JsonNode itemNode = itemsNode.path("item");
            if (itemNode.isArray()) {
                for (JsonNode node : itemNode) {
                    medicines.add(toMedicine(node));
                }
                return new PublicDataPage(medicines, totalCount);
            }

            if (!itemNode.isMissingNode() && !itemNode.isNull()) {
                medicines.add(toMedicine(itemNode));
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse public medication data", e);
        }

        return new PublicDataPage(medicines, 0);
    }

    private Medicine toMedicine(JsonNode itemNode) {
        long itemSeq = itemNode.path("itemSeq").asLong();
        String itemName = itemNode.path("itemName").asText();
        return new Medicine(itemSeq, itemName);
    }

    private record PublicDataPage(List<Medicine> items, int totalCount) {
    }

    public record RefreshResult(int savedCount) {
    }
}
