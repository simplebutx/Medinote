package com.ibmteam02.backend_medication.medicine.config;

import com.ibmteam02.backend_medication.medicine.service.MedicineInfoCsvImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
public class MedicineInfoCsvImportRunner implements CommandLineRunner {

    private final MedicineInfoCsvImportService medicineInfoCsvImportService;

    @Value("${medicine.csv-import.enabled:false}")
    private boolean csvImportEnabled;

    @Value("${medicine.csv-import.path:}")
    private String csvImportPath;

    @Override
    public void run(String... args) throws Exception {
        if (!csvImportEnabled || csvImportPath == null || csvImportPath.isBlank()) {
            return;
        }

        MedicineInfoCsvImportService.CsvImportResult result =
                medicineInfoCsvImportService.importCsv(Path.of(csvImportPath));

        log.info(
                "Medicine CSV import completed. inserted={}, updated={}, skipped={}",
                result.insertedCount(),
                result.updatedCount(),
                result.skippedCount()
        );
    }
}
