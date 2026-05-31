package com.ibmteam02.backend_medication.medicine.service;

import com.ibmteam02.backend_medication.medicine.domain.MedicineInfo;
import com.ibmteam02.backend_medication.medicine.repository.MedicineInfoRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MedicineInfoCsvImportService {

    private final MedicineInfoRepository medicineInfoRepository;

    @Transactional
    public CsvImportResult importCsv(Path csvPath) throws IOException {
        CSVFormat csvFormat = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .build();

        try (Reader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8);
             CSVParser parser = csvFormat.parse(reader)) {

            Map<Long, MedicineInfo> existingMedicineMap = loadExistingMedicineMap();
            int insertedCount = 0;
            int updatedCount = 0;
            int skippedCount = 0;

            for (CSVRecord record : parser) {
                Long itemSeq = parseItemSeq(record.get("ITEM_SEQ"));
                if (itemSeq == null) {
                    skippedCount++;
                    continue;
                }

                String itemName = normalize(record.get("ITEM_NAME"));
                if (itemName == null) {
                    skippedCount++;
                    continue;
                }

                String companyName = normalize(record.get("ENTP_NAME"));
                String storageMethod = normalize(record.get("STORAGE_METHOD"));
                String efficacyDocumentId = normalize(record.get("EE_DOC_ID"));
                String usageDocumentId = normalize(record.get("UD_DOC_ID"));
                String precautionDocumentId = normalize(record.get("NB_DOC_ID"));

                MedicineInfo existingMedicine = existingMedicineMap.get(itemSeq);
                if (existingMedicine == null) {
                    MedicineInfo medicineInfo = new MedicineInfo(
                            itemSeq,
                            itemName,
                            companyName,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            storageMethod,
                            null,
                            null,
                            efficacyDocumentId,
                            usageDocumentId,
                            precautionDocumentId
                    );
                    medicineInfoRepository.save(medicineInfo);
                    existingMedicineMap.put(itemSeq, medicineInfo);
                    insertedCount++;
                    continue;
                }

                existingMedicine.updateFromCsv(
                        itemName,
                        companyName,
                        storageMethod,
                        efficacyDocumentId,
                        usageDocumentId,
                        precautionDocumentId
                );
                updatedCount++;
            }

            return new CsvImportResult(insertedCount, updatedCount, skippedCount);
        }
    }

    private Map<Long, MedicineInfo> loadExistingMedicineMap() {
        List<MedicineInfo> existingMedicines = medicineInfoRepository.findAll();
        Map<Long, MedicineInfo> existingMedicineMap = new HashMap<>();
        for (MedicineInfo medicineInfo : existingMedicines) {
            existingMedicineMap.put(medicineInfo.getItemSeq(), medicineInfo);
        }
        return existingMedicineMap;
    }

    private Long parseItemSeq(String rawValue) {
        String normalizedValue = normalize(rawValue);
        if (normalizedValue == null) {
            return null;
        }

        try {
            return Long.parseLong(normalizedValue);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record CsvImportResult(int insertedCount, int updatedCount, int skippedCount) {
    }
}
