package com.ibmteam02.backend_medication.medicine.scheduler;

import com.ibmteam02.backend_medication.medicine.service.MedicineInfoService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// 공공데이터 자동 동기화 (배치)
@Component
@RequiredArgsConstructor
public class MedicineInfoSyncScheduler {

    private final MedicineInfoService medicineInfoService;

    // 일요일 새벽 3시
    @Scheduled(cron = "0 0 3 * * SUN")
    public void syncWeekly() {
        medicineInfoService.syncMedicines();
    }
}
