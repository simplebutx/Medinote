package com.ibmteam02.backend_medication.schedule.domain;

import com.ibmteam02.backend_medication.global.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medication_schedule_medicine")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicationScheduleMedicine extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_schedule_id", nullable = false)
    private MedicationSchedule medicationSchedule;

    @Column(name = "medicine_id")
    private Long medicineId;

    @Column(name = "custom_medicine_name")
    private String customMedicineName;

    @Column(name = "dosage_amount", precision = 10, scale = 2)
    private BigDecimal dosageAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "dosage_unit")
    private DosageUnit dosageUnit;

    @Column(name = "times_per_day")
    private Integer timesPerDay;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Builder
    public MedicationScheduleMedicine(
            MedicationSchedule medicationSchedule,
            Long medicineId,
            String customMedicineName,
            BigDecimal dosageAmount,
            DosageUnit dosageUnit,
            Integer timesPerDay,
            Integer durationDays,
            LocalDate startDate,
            LocalDate endDate,
            Boolean isActive
    ) {
        this.medicationSchedule = medicationSchedule;
        this.medicineId = medicineId;
        this.customMedicineName = customMedicineName;
        this.dosageAmount = dosageAmount;
        this.dosageUnit = dosageUnit;
        this.timesPerDay = timesPerDay;
        this.durationDays = durationDays;
        this.startDate = startDate;
        this.endDate = endDate;
        this.isActive = isActive;
    }

    public void update(
            MedicationSchedule medicationSchedule,
            Long medicineId,
            String customMedicineName,
            BigDecimal dosageAmount,
            DosageUnit dosageUnit,
            Integer timesPerDay,
            Integer durationDays,
            LocalDate startDate,
            LocalDate endDate,
            Boolean isActive
    ) {
        this.medicationSchedule = medicationSchedule;
        this.medicineId = medicineId;
        this.customMedicineName = customMedicineName;
        this.dosageAmount = dosageAmount;
        this.dosageUnit = dosageUnit;
        this.timesPerDay = timesPerDay;
        this.durationDays = durationDays;
        this.startDate = startDate;
        this.endDate = endDate;
        this.isActive = isActive;
    }

    public void updateScheduleWindow(LocalDate startDate, LocalDate endDate, Boolean isActive) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.isActive = isActive;
    }
}
