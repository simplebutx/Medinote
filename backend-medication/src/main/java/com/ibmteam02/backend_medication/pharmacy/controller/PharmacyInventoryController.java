package com.ibmteam02.backend_medication.pharmacy.controller;

import com.ibmteam02.backend_medication.global.auth.JwtProvider;
import com.ibmteam02.backend_medication.pharmacy.domain.PharmacyInventory;
import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyInventoryRequest;
import com.ibmteam02.backend_medication.pharmacy.service.PharmacyInventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacist/inventory")
@RequiredArgsConstructor
public class PharmacyInventoryController {

    private final PharmacyInventoryService pharmacyInventoryService;
    private final JwtProvider jwtProvider;

    //약국 재고 등록 및 수정
    @PostMapping
    public ResponseEntity<?> savaInventory(
            @RequestHeader("Authorization") String bearerToken,
            @RequestBody PharmacyInventoryRequest pharmacyInventoryRequest
            ){
        String token = bearerToken.substring(7);
        Long pharmacistId = jwtProvider.getUserIdFromToken(token);

        pharmacyInventoryService.savePharmacyInventory(pharmacistId,pharmacyInventoryRequest);
        return ResponseEntity.ok("재고 등록 완료");
    }

    //약국 재고 조회
    @GetMapping
    public ResponseEntity<?> getMyInventory(
            @RequestHeader("Authorization") String bearerToken){

        String token = bearerToken.substring(7);
        Long pharmacistId = jwtProvider.getUserIdFromToken(token);

        List<PharmacyInventory> inventory = pharmacyInventoryService.getMyInventory(pharmacistId);
        return ResponseEntity.ok(inventory);
    }
}
