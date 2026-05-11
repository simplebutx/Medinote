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

    private final ObjectMapper objectMapper = new ObjectMapper();  // JSON 변환 도구
    private final RestClient restClient = RestClient.create();  // 외부 API에 HTTP요청 전송 도구
    private final MedicineRepository medicineRepository;

    @Value("${public-data.service-key}")
    private String serviceKey;

    @Value("${public-data.base-url}")
    private String baseUrl;

    // 공공데이터 DB에 저장
    @Transactional
    public RefreshResult refreshMedicines() {
        // API 요청 URL 만들기
        URI requestUri = UriComponentsBuilder.fromUriString(baseUrl)
                .queryParam("serviceKey", serviceKey)
                .queryParam("type", "json")
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 100)
                .build(true)
                .toUri();

        // RestClient로 API 요청 보내고 응답 받기
        String response = restClient.get()
                .uri(requestUri)
                .retrieve()
                .body(String.class);

        try {
            List<Medicine> medicines = new ArrayList<>();
            JsonNode root = objectMapper.readTree(response);  // readTree(): JsonNode라는 JSON객체 구조로 바꾸는 함수
            JsonNode itemsNode = root.path("body").path("items");  // body안 items로 들어감
            JsonNode itemNode = itemsNode.path("item");  // 그 안 item으로 들어감

            // itemNode안에 있는 데이터들을 하나씩 Medicine객체로 변환, 리스트에 저장
            for (JsonNode node : itemNode) {
                medicines.add(toMedicine(node));
            }

            medicineRepository.saveAll(medicines);  // db에 저장
            return new RefreshResult(medicines.size());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse public medication data", e);
        }
    }

    // JSON 데이터 한개를 Medicine 객체로 변환
    private Medicine toMedicine(JsonNode itemNode) {
        long itemSeq = itemNode.path("itemSeq").asLong();
        String itemName = itemNode.path("itemName").asText();
        return new Medicine(itemSeq, itemName);
    }

    // 저장된 약 개수 불러오기 (로그용)
    public record RefreshResult(int savedCount) {
    }
}
