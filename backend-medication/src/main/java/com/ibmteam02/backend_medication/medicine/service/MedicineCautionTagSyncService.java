package com.ibmteam02.backend_medication.medicine.service;

import com.ibmteam02.backend_medication.ai.client.AiMedicineCautionTagClient;
import com.ibmteam02.backend_medication.ai.dto.AiMedicineCautionTag;
import com.ibmteam02.backend_medication.ai.dto.AiMedicineCautionTagExtractResponse;
import com.ibmteam02.backend_medication.ai.dto.AiMedicineCautionTagItem;
import com.ibmteam02.backend_medication.medicine.domain.MedicineCautionTag;
import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.dto.MedicineCautionTagSyncResponse;
import com.ibmteam02.backend_medication.medicine.repository.MedicineCautionTagRepository;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class MedicineCautionTagSyncService {

    private final AiMedicineCautionTagClient aiMedicineCautionTagClient;
    private final MedicineInfoRepository medicineInfoRepository;
    private final MedicineCautionTagRepository medicineCautionTagRepository;

    @Transactional
    public MedicineCautionTagSyncResponse syncQdrantMedicineTags() {
        AiMedicineCautionTagExtractResponse response = aiMedicineCautionTagClient.extractTags();
        List<AiMedicineCautionTagItem> items = response != null && response.items() != null
                ? response.items()
                : List.of();
        if (items.isEmpty()) {
            return new MedicineCautionTagSyncResponse(0, 0, 0);
        }

        List<String> medicineNames = items.stream()
                .map(AiMedicineCautionTagItem::medicineName)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        Map<String, MedicineInfo> medicinesByName = medicineInfoRepository.findByItemNameIn(medicineNames).stream()
                .collect(Collectors.toMap(MedicineInfo::getItemName, Function.identity(), (left, right) -> left));

        Set<Long> matchedItemSeqs = items.stream()
                .map(item -> medicinesByName.get(item.medicineName()))
                .filter(medicine -> medicine != null)
                .map(MedicineInfo::getItemSeq)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!matchedItemSeqs.isEmpty()) {
            medicineCautionTagRepository.deleteByItemSeqIn(matchedItemSeqs);
        }

        List<MedicineCautionTag> tagsToSave = new ArrayList<>();
        for (AiMedicineCautionTagItem item : items) {
            MedicineInfo medicine = medicinesByName.get(item.medicineName());
            if (medicine == null || item.tags() == null || item.tags().isEmpty()) {
                continue;
            }

            for (AiMedicineCautionTag tag : item.tags()) {
                if (!StringUtils.hasText(tag.tagCode()) || !StringUtils.hasText(tag.tagName())) {
                    continue;
                }
                tagsToSave.add(new MedicineCautionTag(
                        medicine.getItemSeq(),
                        tag.tagCode(),
                        tag.tagName(),
                        joinKeywords(tag.matchedKeywords())
                ));
            }
        }

        medicineCautionTagRepository.saveAll(tagsToSave);

        return new MedicineCautionTagSyncResponse(
                items.size(),
                matchedItemSeqs.size(),
                tagsToSave.size()
        );
    }

    private String joinKeywords(List<String> keywords) {
        if (keywords == null || keywords.isEmpty()) {
            return "";
        }

        return keywords.stream()
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.joining(","));
    }
}
