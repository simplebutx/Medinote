package com.ibmteam02.backend_medication.caution.service;

import com.ibmteam02.backend_medication.caution.domain.UserMedicationCaution;
import com.ibmteam02.backend_medication.caution.dto.CautionSuggestionResponse;
import com.ibmteam02.backend_medication.caution.dto.UserMedicationCautionRequest;
import com.ibmteam02.backend_medication.caution.dto.UserMedicationCautionResponse;
import com.ibmteam02.backend_medication.caution.repository.UserMedicationCautionRepository;
import com.ibmteam02.backend_medication.global.exception.ForbiddenException;
import com.ibmteam02.backend_medication.global.exception.ResourceNotFoundException;
import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineIngredientRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserMedicationCautionService {

    private final UserMedicationCautionRepository userMedicationCautionRepository;
    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineIngredientRepository medicineIngredientRepository;

    // 자동완성
    public List<CautionSuggestionResponse> suggest(String keyword, String type) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }

        // 선택한 타입 (약/성분)에 따라 검색 다르게
        if ("INGREDIENT".equalsIgnoreCase(type)) {
            return medicineIngredientRepository.findTop10ByIngredientNameContaining(keyword).stream()
                    .map(MedicineIngredient::getIngredientName)
                    .distinct()
                    .map(ingredientName -> new CautionSuggestionResponse(ingredientName, "INGREDIENT"))
                    .toList();
        }

        return medicineInfoRepository.findTop10ByItemNameContaining(keyword).stream()
                .map(MedicineInfo::getItemName)
                .distinct()
                .map(medicineName -> new CautionSuggestionResponse(medicineName, "MEDICINE"))
                .toList();
    }

    // 내 주의 약·성분 등록
    @Transactional
    public UserMedicationCautionResponse create(Long userId, UserMedicationCautionRequest request) {
        LocalDateTime now = LocalDateTime.now();
        UserMedicationCaution caution = new UserMedicationCaution(
                userId,
                request.itemSeq(),
                request.itemName(),
                request.ingredientCode(),
                request.ingredientName(),
                request.reason(),
                request.memo(),
                now,
                now
        );

        return toResponse(userMedicationCautionRepository.save(caution));
    }

    // 내 주의 약·성분 목록 조회
    @Transactional(readOnly = true)
    public List<UserMedicationCautionResponse> getList(Long userId) {
        return userMedicationCautionRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    // 내 주의 약·성분 상세 조회
    @Transactional(readOnly = true)
    public UserMedicationCautionResponse getDetail(Long userId, Long id) {
        UserMedicationCaution caution = findById(id);

        if (!caution.getUserId().equals(userId)) {
            throw new ForbiddenException("본인 주의 약·성분만 조회할 수 있습니다.");
        }

        return toResponse(caution);
    }

    // 내 주의 약·성분 수정
    @Transactional
    public UserMedicationCautionResponse update(Long userId, Long id, UserMedicationCautionRequest request) {
        UserMedicationCaution caution = findById(id);

        if (!caution.getUserId().equals(userId)) {
            throw new ForbiddenException("본인 주의 약·성분만 수정할 수 있습니다.");
        }

        caution.update(
                request.itemSeq(),
                request.itemName(),
                request.ingredientCode(),
                request.ingredientName(),
                request.reason(),
                request.memo(),
                LocalDateTime.now()
        );

        return toResponse(caution);
    }

    // 내 주의 약·성분 삭제
    @Transactional
    public void delete(Long userId, Long id) {
        UserMedicationCaution caution = findById(id);

        if (!caution.getUserId().equals(userId)) {
            throw new ForbiddenException("본인 주의 약·성분만 삭제할 수 있습니다.");
        }

        userMedicationCautionRepository.delete(caution);
    }

    private UserMedicationCaution findById(Long id) {
        return userMedicationCautionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("해당 주의 약·성분을 찾을 수 없습니다. id=" + id));
    }

    private UserMedicationCautionResponse toResponse(UserMedicationCaution caution) {
        return new UserMedicationCautionResponse(
                caution.getId(),
                caution.getUserId(),
                caution.getItemSeq(),
                caution.getItemName(),
                caution.getIngredientCode(),
                caution.getIngredientName(),
                caution.getReason(),
                caution.getMemo(),
                caution.getCreatedAt(),
                caution.getUpdatedAt()
        );
    }
}
