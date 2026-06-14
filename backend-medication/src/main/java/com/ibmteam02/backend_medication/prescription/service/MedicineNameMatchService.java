package com.ibmteam02.backend_medication.prescription.service;

import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicineNameMatchService {
    private final MedicineInfoRepository medicineInfoRepository;

    // DB 약품명 후보 하나
    public record MatchCandidate(String name, double score, String reason) {
    }

    // 최종 매칭 결과 전체
    public record MatchResult(String matchedName, double score, String status, List<MatchCandidate> candidates) {
    }

    public MatchResult matchNameWithCandidates(String ocrMedicineName) {
        if (ocrMedicineName == null || ocrMedicineName.isBlank()) {
            return new MatchResult(null, 0, "NO_INPUT", List.of());
        }

        // db에 있는 전체 약품명 가져오기
        List<String> medicineNames = medicineInfoRepository.findAllItemNames();

        // ocr 약명 정규화
        String normalizedOcrMedicineName = normalize(ocrMedicineName);   // ocr 추출 약명 정규화
        if (normalizedOcrMedicineName.isBlank()) {
            return new MatchResult(null, 0, "NO_INPUT", List.of());
        }

        // db약품명마다 후보 점수 계산 (Top-K 방식)
        List<MatchCandidate> candidates = medicineNames.stream()
                .map(medicineName -> toCandidate(normalizedOcrMedicineName, medicineName))
                .filter(candidate -> candidate.score() >= 0.55)
                .sorted(Comparator.comparingDouble(MatchCandidate::score).reversed())
                .limit(3)
                .toList();

        if (candidates.isEmpty()) {
            return new MatchResult(null, 0, "NO_MATCH", List.of());
        }

        // 1등 후보 기준 결정
        MatchCandidate best = candidates.get(0);
        String status = best.score() >= 0.92 ? "AUTO_MATCHED"
                : best.score() >= 0.75 ? "NEEDS_CONFIRMATION"
                : "LOW_CONFIDENCE";

        // 신뢰도가 낮으면 자동 선택하지 않음
        String matchedName = "LOW_CONFIDENCE".equals(status) ? null : best.name();
        return new MatchResult(matchedName, best.score(), status, candidates);
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
        if (value == null) {
            return "";
        }
        return value
                .replaceAll("\\s+", "")
                .replace("밀리그람", "밀리그램")
                .replace("미리그램", "밀리그램")
                .replace("미리그람", "밀리그램")
                .replace("패취", "패치")
                .replaceAll("[\\[\\]{}()·,.:;\\-_/]", "")
                .toLowerCase();
    }

    private MatchCandidate toCandidate(String normalizedOcrMedicineName, String medicineName) {
        String normalizedMedicineName = normalize(medicineName);   // db 약명들 정규화
        String normalizedShortMedicineName = stripStrength(normalizedMedicineName);
        String normalizedShortOcrMedicineName = stripStrength(normalizedOcrMedicineName);

        if (normalizedMedicineName.equals(normalizedOcrMedicineName)) {  // 정규화한 값끼리 같은지
            return new MatchCandidate(medicineName, 1.0, "exact");
        }
        if (!normalizedShortMedicineName.isBlank()
                && normalizedShortMedicineName.equals(normalizedShortOcrMedicineName)) {
            return new MatchCandidate(medicineName, 0.94, "exact_without_strength");
        }
        if (normalizedOcrMedicineName.contains(normalizedMedicineName)) {  // 둘중하나가 다른 하나를 포함하는지
            return new MatchCandidate(medicineName, 0.90, "ocr_contains_db_name");
        }
        if (normalizedMedicineName.contains(normalizedOcrMedicineName)) {
            double score = normalizedOcrMedicineName.length() >= 4 ? 0.86 : 0.68;
            return new MatchCandidate(medicineName, score, "db_contains_ocr_name");
        }
        if (!normalizedShortMedicineName.isBlank()
                && normalizedOcrMedicineName.contains(normalizedShortMedicineName)) {
            return new MatchCandidate(medicineName, 0.82, "ocr_contains_db_name_without_strength");
        }

        int distance = levenshtein(normalizedOcrMedicineName, normalizedMedicineName);  // 유사도가 높은 거 (거리가 낮은거) 반환
        int maxLength = Math.max(normalizedOcrMedicineName.length(), normalizedMedicineName.length());
        double similarity = maxLength == 0 ? 0 : 1.0 - ((double) distance / maxLength);
        return new MatchCandidate(medicineName, Math.max(0, similarity), "edit_distance");
    }

    private String stripStrength(String value) {
        return value.replaceAll("\\d+(?:\\.\\d+)?(?:밀리그램|mg|mL|ml|마이크로그램|mcg|그램|g)", "");
    }
}
