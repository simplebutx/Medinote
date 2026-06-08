package com.ibmteam02.backend_medication.pharmacy.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "pharmacist_inventory")
public class PharmacyInventory {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long pharmacistId;

    @Column(nullable = false)
    private String pharmacyHpid;

    @Column(nullable = false)
    private String itemSeq;

    @Column(nullable = false)
    private String itemName;

    private String companyName;

    @Column(nullable = false)
    private Integer stockQuantity;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public PharmacyInventory(Long pharmacistId, String pharmacyHpid, String itemSeq,
                             String itemName, String companyName, Integer stockQuantity){
        this.pharmacistId = pharmacistId;
        this.pharmacyHpid = pharmacyHpid;
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.companyName = companyName;
        this.stockQuantity = stockQuantity;
    }

    public void updateStock(Integer quantity){
        this.stockQuantity = quantity;
    }

    @PrePersist
    void onCreate() {
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
