package com.ibmteam02.backend_medication.schedule.domain;

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
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medication_schedule_time")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicationScheduleTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_schedule_id", nullable = false)
    private MedicationSchedule medicationSchedule;

    @Enumerated(EnumType.STRING)
    @Column(name = "timing", nullable = false)
    private MedicationTiming timing;

    @Column(name = "take_time", nullable = false)
    private LocalTime takeTime;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Builder
    public MedicationScheduleTime(
            MedicationSchedule medicationSchedule,
            MedicationTiming timing,
            LocalTime takeTime,
            Integer sortOrder
    ) {
        this.medicationSchedule = medicationSchedule;
        this.timing = timing;
        this.takeTime = takeTime;
        this.sortOrder = sortOrder;
    }

    public void update(
            MedicationSchedule medicationSchedule,
            MedicationTiming timing,
            LocalTime takeTime,
            Integer sortOrder
    ) {
        this.medicationSchedule = medicationSchedule;
        this.timing = timing;
        this.takeTime = takeTime;
        this.sortOrder = sortOrder;
    }
}
