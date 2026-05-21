package com.ibmteam02.backend_medication.schedule.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medication_schedule")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicationSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "medicine_id")
    private Long medicineId;

    @Column(name = "custom_medicine_name")
    private String customMedicineName;

    @Column(name = "hospital_name")
    private String hospitalName;

    @Column(name = "pharmacy_name")
    private String pharmacyName;

    @Column(name = "dosage_amount", precision = 10, scale = 2)
    private BigDecimal dosageAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "dosage_unit")
    private DosageUnit dosageUnit;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency_type")
    private FrequencyType frequencyType;

    @Column(name = "times_per_day")
    private Integer timesPerDay;

    @Column(name = "interval_hours")
    private Integer intervalHours;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "prescribed_date")
    private LocalDate prescribedDate;

    @Column(name = "dispensed_date")
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
            Long medicineId,
            String customMedicineName,
            String hospitalName,
            String pharmacyName,
            BigDecimal dosageAmount,
            DosageUnit dosageUnit,
            FrequencyType frequencyType,
            Integer timesPerDay,
            Integer intervalHours,
            Integer durationDays,
            LocalDate startDate,
            LocalDate endDate,
            LocalDate prescribedDate,
            LocalDate dispensedDate,
            Boolean isActive
    ) {
        this.userId = userId;
        this.medicineId = medicineId;
        this.customMedicineName = customMedicineName;
        this.hospitalName = hospitalName;
        this.pharmacyName = pharmacyName;
        this.dosageAmount = dosageAmount;
        this.dosageUnit = dosageUnit;
        this.frequencyType = frequencyType;
        this.timesPerDay = timesPerDay;
        this.intervalHours = intervalHours;
        this.durationDays = durationDays;
        this.startDate = startDate;
        this.endDate = endDate;
        this.prescribedDate = prescribedDate;
        this.dispensedDate = dispensedDate;
        this.isActive = isActive;
    }

    public void update(
            Long userId,
            Long medicineId,
            String customMedicineName,
            String hospitalName,
            String pharmacyName,
            BigDecimal dosageAmount,
            DosageUnit dosageUnit,
            FrequencyType frequencyType,
            Integer timesPerDay,
            Integer intervalHours,
            Integer durationDays,
            LocalDate startDate,
            LocalDate endDate,
            LocalDate prescribedDate,
            LocalDate dispensedDate,
            Boolean isActive
    ) {
        this.userId = userId;
        this.medicineId = medicineId;
        this.customMedicineName = customMedicineName;
        this.hospitalName = hospitalName;
        this.pharmacyName = pharmacyName;
        this.dosageAmount = dosageAmount;
        this.dosageUnit = dosageUnit;
        this.frequencyType = frequencyType;
        this.timesPerDay = timesPerDay;
        this.intervalHours = intervalHours;
        this.durationDays = durationDays;
        this.startDate = startDate;
        this.endDate = endDate;
        this.prescribedDate = prescribedDate;
        this.dispensedDate = dispensedDate;
        this.isActive = isActive;
    }

    public void updateScheduleWindow(LocalDate startDate, LocalDate endDate, Boolean isActive) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.isActive = isActive;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
