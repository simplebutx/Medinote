package com.ibmteam02.backend_medication.medicine.controller;

import com.ibmteam02.backend_medication.medicine.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    @PostMapping("/refresh")
    public MedicineService.RefreshResult refreshMedicines() {
        return medicineService.refreshMedicines();
    }
}
