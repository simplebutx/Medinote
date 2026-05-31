package com.ibmteam02.backend_medication.prescription.service;

import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor


public class MedicineNameMatchService {
    private final MedicineInfoRepository medicineInfoRepository;

    // OCR 추출 약명 하나 - db 약명 비교, 매칭
    public String matchName(String ocrMedicineName) {
        if (ocrMedicineName == null || ocrMedicineName.isBlank()) {
            return null;
        }

        List<String> medicineNames = medicineInfoRepository.findAllItemNames();

        String normalizedOcrMedicineName = normalize(ocrMedicineName);   // ocr 추출 약명 정규화

        for (String medicineName : medicineNames) {
            String normalizedMedicineName = normalize(medicineName);   // db 약명들 정규화

            if (normalizedMedicineName.equals(normalizedOcrMedicineName)) {  // 정규화한 값끼리 같은지
                return medicineName;
            }
        }

        for (String medicineName : medicineNames) {
            String normalizedMedicineName = normalize(medicineName);

            if (normalizedOcrMedicineName.contains(normalizedMedicineName)
                    || normalizedMedicineName.contains(normalizedOcrMedicineName)) {  // 둘중하나가 다른 하나를 포함하는지
                return medicineName;
            }
        }

        String bestMatch = null;
        int bestDistance = Integer.MAX_VALUE;

        for (String medicineName : medicineNames) {
            String normalizedMedicineName = normalize(medicineName);
            int distance = levenshtein(normalizedOcrMedicineName, normalizedMedicineName);  // 유사도가 높은 거 (거리가 낮은거) 반환

            if(distance < bestDistance) {
                bestDistance = distance;
                bestMatch = medicineName;
            }
        }
        return bestDistance <= 2 ? bestMatch : null;
    }

    // 유사도 계산 (두 문자열이 서로 같아지려면 몇번 수정해야하는지)
    private int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];

        for (int i = 0; i <= a.length(); i++) {
            dp[i][0] = i;
        }

        for (int j = 0; j <= b.length(); j++) {
            dp[0][j] = j;
        }

        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;

                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }

        return dp[a.length()][b.length()];
    }


    // 전처리
    private String normalize(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "");
    }
}
