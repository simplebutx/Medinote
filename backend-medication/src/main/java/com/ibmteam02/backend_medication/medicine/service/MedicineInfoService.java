package com.ibmteam02.backend_medication.medicine.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineIngredientRepository;
import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class MedicineInfoService {

    private static final DateTimeFormatter REQUEST_DATE_FORMATTER = DateTimeFormatter.BASIC_ISO_DATE;  // YYYYMMDD 형식 포맷터
    private static final DateTimeFormatter UPDATE_DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;  // YYYY-MM-DD 형식 포맷터
    private static final int PAGE_SIZE = 100;

    private final ObjectMapper objectMapper = new ObjectMapper();  // API 응답 JSON 문자열을 JsonNode로 변환하는 도구
    private final RestClient restClient = RestClient.create();  // 공공데이터 API에 HTTP 요청을 보내는 도구
    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineIngredientRepository medicineIngredientRepository;

    @Value("${public-data.service-key}")
    private String serviceKey;

    @Value("${public-data.base-url}")
    private String baseUrl;

    @Value("${public-data.ingredient-base-url}")
    private String ingredientBaseUrl;

    // 내DB의 최신 updateDe를 기준.
    // 공공데이터의 updateDe 중에서 내DB의 최신 updateDe보다 같거나 최신인것들만 골라서
    // 바뀐 약만 업데이트
    @Transactional
    public SyncResult syncMedicines() {
        String lastSyncedPublicUpdateDe = getLastSyncedPublicUpdateDe();  // DB에 있는 updateDe 날짜 중에 가장 최신 날짜
        LocalDate startDate = parseUpdateDe(lastSyncedPublicUpdateDe);  // 비교 시작날짜 (LocalDate 타입으로 변환)
        LocalDate today = LocalDate.now();

        if (startDate == null) {
            startDate = today;
        }

        int checkedCount = 0;  // 공공데이터에서 조회해서 비교 대상으로 본 약 개수
        int insertedCount = 0; // 내 db에 없어서 새로 추가한 약 개수
        int updatedCount = 0; // 공공데이터에서 조회해서 비교한 것중에 더 최신이라서 수정한 약 개수
        int requestedDateCount = 0; // 공공데이터 API에 요청한 날짜 수
        Set<Long> changedItemSeqSet = new LinkedHashSet<>();  // 업데이트된 약들의 itemSeq 모아두는 자료구조 (Set을 쓰는 이유는 중복 제거)

        try {
            // startDate부터 today까지 하루씩 돌면서, 그날짜에 수정된 약이 있으면 저장하기 반복
            for (LocalDate targetDate = startDate; !targetDate.isAfter(today); targetDate = targetDate.plusDays(1)) {
                PageSyncCount count = syncMedicineInfoByDate(formatRequestDate(targetDate), changedItemSeqSet);
                checkedCount += count.checkedCount();
                insertedCount += count.insertedCount();
                updatedCount += count.updatedCount();
                requestedDateCount++;
            }

            IngredientSyncCount ingredientSyncCount = syncMedicineIngredients(changedItemSeqSet);  // 성분 정보 업데이트
            String latestPublicUpdateDe = getLatestPublicUpdateDe();  // 공공데이터 최신 수정날짜

            return new SyncResult(
                    checkedCount,
                    insertedCount,
                    updatedCount,
                    ingredientSyncCount.syncedItemCount(),
                    ingredientSyncCount.savedRowCount(),
                    requestedDateCount,
                    getLastSyncedPublicUpdateDe(),
                    latestPublicUpdateDe
            );
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sync public medication data", e);
        }
    }

    // 클라이언트 화면에보여줄 마지막으로 반영한 공공데이터 날짜와 현재 최신 날짜 반환
    @Transactional(readOnly = true)
    public SyncStatus getSyncStatus() {
        return new SyncStatus(getLastSyncedPublicUpdateDe(), getLatestPublicUpdateDe());
    }

    // DB에 있는 updateDe 날짜 중에 최신거를 찾아 그 날짜 가져오기
    @Transactional(readOnly = true)
    public String getLastSyncedPublicUpdateDe() {
        return medicineInfoRepository.findTopByOrderByUpdateDeDesc()
                .map(MedicineInfo::getUpdateDe)
                .orElse(null);
    }

    // 공공데이터 첫 페이지에서 최신 수정일을 확인
    public String getLatestPublicUpdateDe() {
        try {
            JsonNode bodyNode = fetchBodyNode(baseUrl, 1, PAGE_SIZE, null, null);
            JsonNode itemsNode = bodyNode.path("items");

            String latestUpdateDe = null;
            for (JsonNode itemNode : itemsNode) {
                String updateDe = itemNode.path("updateDe").asText();
                if (!updateDe.isBlank() && (latestUpdateDe == null || compareUpdateDe(updateDe, latestUpdateDe) > 0)) {
                    latestUpdateDe = updateDe;
                }
            }
            return latestUpdateDe;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to fetch latest public update date", e);
        }
    }

    // 기준날짜부터 오늘까지 공공데이터 약 정보를 전부 가져와서, 내 db에없으면 추가, 있는데 최신이면 업데이트
    private PageSyncCount syncMedicineInfoByDate(String updateDe, Set<Long> changedItemSeqSet) throws Exception {
        int pageNo = 1;
        int totalPages = 1;
        int checkedCount = 0;
        int insertedCount = 0;
        int updatedCount = 0;

        while (pageNo <= totalPages) {
            JsonNode bodyNode = fetchBodyNode(baseUrl, pageNo, PAGE_SIZE, updateDe, null);
            JsonNode itemsNode = bodyNode.path("items");

            if (pageNo == 1) {
                totalPages = getTotalPages(bodyNode.path("totalCount").asInt());
            }

            List<MedicineInfo> incomingMedicines = new ArrayList<>();
            List<Long> itemSeqList = new ArrayList<>();

            for (JsonNode itemNode : itemsNode) {
                MedicineInfo medicineInfo = toMedicine(itemNode);
                incomingMedicines.add(medicineInfo);
                itemSeqList.add(medicineInfo.getItemSeq());
            }

            Map<Long, MedicineInfo> existingMedicineMap = new HashMap<>();
            for (MedicineInfo medicineInfo : medicineInfoRepository.findAllById(itemSeqList)) {
                existingMedicineMap.put(medicineInfo.getItemSeq(), medicineInfo);
            }

            List<MedicineInfo> medicinesToSave = new ArrayList<>();

            for (MedicineInfo incomingMedicine : incomingMedicines) {
                checkedCount++;
                MedicineInfo existingMedicine = existingMedicineMap.get(incomingMedicine.getItemSeq());

                if (existingMedicine == null) {
                    medicinesToSave.add(incomingMedicine);
                    changedItemSeqSet.add(incomingMedicine.getItemSeq());
                    insertedCount++;
                    continue;
                }

                if (isIncomingNewer(existingMedicine.getUpdateDe(), incomingMedicine.getUpdateDe())) {
                    medicinesToSave.add(incomingMedicine);
                    changedItemSeqSet.add(incomingMedicine.getItemSeq());
                    updatedCount++;
                }
            }

            if (!medicinesToSave.isEmpty()) {
                medicineInfoRepository.saveAll(medicinesToSave);
            }

            pageNo++;
        }

        return new PageSyncCount(checkedCount, insertedCount, updatedCount);
    }

    // 바뀐 약의 itemSeq만 대상으로 성분 정보를 다시 업데이트
    private IngredientSyncCount syncMedicineIngredients(Set<Long> changedItemSeqSet) throws Exception {
        if (changedItemSeqSet.isEmpty()) {
            return new IngredientSyncCount(0, 0);
        }

        List<MedicineIngredient> ingredientsToSave = new ArrayList<>();

        for (Long itemSeq : changedItemSeqSet) {
            int pageNo = 1;
            int totalPages = 1;

            while (pageNo <= totalPages) {
                JsonNode bodyNode = fetchBodyNode(ingredientBaseUrl, pageNo, PAGE_SIZE, null, itemSeq);
                JsonNode itemsNode = bodyNode.path("items");

                if (pageNo == 1) {
                    totalPages = getTotalPages(bodyNode.path("totalCount").asInt());
                }

                for (JsonNode itemNode : itemsNode) {
                    ingredientsToSave.add(toMedicineIngredient(itemNode));
                }

                pageNo++;
            }
        }

        medicineIngredientRepository.deleteByItemSeqIn(changedItemSeqSet);

        if (!ingredientsToSave.isEmpty()) {
            medicineIngredientRepository.saveAll(ingredientsToSave);
        }

        return new IngredientSyncCount(changedItemSeqSet.size(), ingredientsToSave.size());
    }

    // 공공데이터 API 요청 URL을 만들고 → API 호출하고 → 응답 JSON을 파싱해서 → body 부분만 꺼내서 반환하는 함수
    private JsonNode fetchBodyNode(
            String requestBaseUrl,
            int pageNo,
            int numOfRows,
            String updateDe,
            Long itemSeq
    ) throws Exception {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(requestBaseUrl)
                .queryParam("serviceKey", serviceKey)
                .queryParam("type", "json")
                .queryParam("pageNo", pageNo)
                .queryParam("numOfRows", numOfRows);

        if (updateDe != null) {
            builder.queryParam("updateDe", updateDe);
        }

        if (itemSeq != null) {
            builder.queryParam("itemSeq", itemSeq);
        }

        URI requestUri = builder.build(true).toUri();
        String response = restClient.get()
                .uri(requestUri)
                .retrieve()
                .body(String.class);

        return objectMapper.readTree(response).path("body");
    }

    // 전체 데이터 개수 totalCount를 보고, 총 몇 페이지를 요청해야 하는지 계산하는 함수
    private int getTotalPages(int totalCount) {
        if (totalCount <= 0) {
            return 0;
        }
        return (int) Math.ceil((double) totalCount / PAGE_SIZE);
    }

    // 기존 DB 데이터의 updateDe와 공공데이터에서 새로 들어온 updateDe를 비교해서, 공공데이터 쪽이 더 최신인지 판단하는 함수
    private boolean isIncomingNewer(String currentUpdateDe, String incomingUpdateDe) {
        if (incomingUpdateDe == null || incomingUpdateDe.isBlank()) {
            return false;
        }
        if (currentUpdateDe == null || currentUpdateDe.isBlank()) {
            return true;
        }

        LocalDate currentDate = parseUpdateDe(currentUpdateDe);
        LocalDate incomingDate = parseUpdateDe(incomingUpdateDe);

        if (currentDate == null || incomingDate == null) {
            return !incomingUpdateDe.equals(currentUpdateDe);
        }

        return incomingDate.isAfter(currentDate);
    }

    // 두 개의 updateDe 값을 비교해서 어느 쪽 날짜가 더 최신인지 판단하는 함수
    private int compareUpdateDe(String leftUpdateDe, String rightUpdateDe) {
        LocalDate leftDate = parseUpdateDe(leftUpdateDe);
        LocalDate rightDate = parseUpdateDe(rightUpdateDe);

        if (leftDate == null || rightDate == null) {
            return leftUpdateDe.compareTo(rightUpdateDe);
        }

        return leftDate.compareTo(rightDate);
    }

    // 문자열로 된 updateDe 값을 LocalDate 타입으로 변환 (String -> LocalDate)
    private LocalDate parseUpdateDe(String updateDe) {
        if (updateDe == null || updateDe.isBlank()) {
            return null;
        }

        try {
            return LocalDate.parse(updateDe, UPDATE_DATE_FORMATTER);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    // LocalDate 타입의 날짜를 공공데이터 API 요청에 넣을 문자열 형식으로 바꿔주는 함수 (LocalDate -> String)
    private String formatRequestDate(LocalDate date) {
        return date.format(REQUEST_DATE_FORMATTER);
    }

    // 공공데이터 약 정보를 엔티티로 변환
    private MedicineInfo toMedicine(JsonNode itemNode) {
        return new MedicineInfo(
                itemNode.path("itemSeq").asLong(),
                itemNode.path("itemName").asText(),
                itemNode.path("efcyQesitm").asText(),
                itemNode.path("useMethodQesitm").asText(),
                itemNode.path("atpnWarnQesitm").asText(),
                itemNode.path("atpnQesitm").asText(),
                itemNode.path("intrcQesitm").asText(),
                itemNode.path("seQesitm").asText(),
                itemNode.path("depositMethodQesitm").asText(),
                itemNode.path("updateDe").asText()
        );
    }

    // 공공데이터 성분 정보를 엔티티로 변환
    private MedicineIngredient toMedicineIngredient(JsonNode itemNode) {
        return new MedicineIngredient(
                itemNode.path("ITEM_SEQ").asLong(),
                itemNode.path("PRDUCT").asText(),
                itemNode.path("MTRAL_SN").asText(),
                itemNode.path("MTRAL_CODE").asText(),
                itemNode.path("MTRAL_NM").asText(),
                itemNode.path("QNT").asText(),
                itemNode.path("INGD_UNIT_CD").asText(),
                itemNode.path("TAMT_SEQ").asText()
        );
    }

    // 약 정보 동기화 결과
    private record PageSyncCount(int checkedCount, int insertedCount, int updatedCount) {
    }

    // 약 성분 동기화 결과
    private record IngredientSyncCount(int syncedItemCount, int savedRowCount) {
    }

    // 현재 동기화 상태
    public record SyncStatus(String lastSyncedPublicUpdateDe, String latestPublicUpdateDe) {
    }

    // 약 정보 동기화 작업이 끝난 뒤 결과를 한 번에 담아서 반환하는 DTO
    public record SyncResult(
            int checkedCount,
            int insertedCount,
            int updatedCount,
            int syncedIngredientItemCount,
            int savedIngredientRowCount,
            int requestedDateCount,
            String lastSyncedPublicUpdateDe,
            String latestPublicUpdateDe
    ) {
    }
}

// 총정리:
// DB에 저장된 약 정보 중 가장 최신 updateDe를 찾고,
// 그 날짜부터 오늘까지 하루씩 공공데이터 API를 조회한다.
// 해당 날짜에 수정된 약이 있으면 DB에 새로 추가하거나 업데이트하고,
// 변경된 약들의 성분 정보도 다시 동기화한다.
// 마지막으로 검사 수, 삽입 수, 수정 수, 성분 동기화 수, 최근 동기화 날짜, 공공데이터 최신 업데이트 날짜를 반환한다.