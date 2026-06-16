package com.ibmteam02.backend_medication.schedule.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import com.ibmteam02.backend_medication.global.util.StringEncryptionConverter;
import com.ibmteam02.backend_medication.global.util.LocalDateEncryptionConverter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medication_schedule")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicationSchedule {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "hospital_name", nullable = false, columnDefinition = "VARCHAR(512)")
    @Convert(converter = StringEncryptionConverter.class)
    private String hospitalName;

    @Column(name = "pharmacy_name", columnDefinition = "VARCHAR(512)")
    @Convert(converter = StringEncryptionConverter.class)
    private String pharmacyName;

    @Column(name = "dispensed_date", columnDefinition = "VARCHAR(512)")
    @Convert(converter = LocalDateEncryptionConverter.class)
    private LocalDate dispensedDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public MedicationSchedule(
            Long userId,
            String hospitalName,
            String pharmacyName,
            LocalDate dispensedDate,
            Boolean isActive
    ) {
        this.userId = userId;
        this.hospitalName = hospitalName;
        this.pharmacyName = pharmacyName;
        this.dispensedDate = dispensedDate;
        this.isActive = isActive;
    }

    public void update(
            Long userId,
            String hospitalName,
            String pharmacyName,
            LocalDate dispensedDate,
            Boolean isActive
    ) {
        this.userId = userId;
        this.hospitalName = hospitalName;
        this.pharmacyName = pharmacyName;
        this.dispensedDate = dispensedDate;
        this.isActive = isActive;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(SCHEDULE_ZONE);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
