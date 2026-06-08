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
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "medication_intake_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicationIntakeLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_schedule_id", nullable = false)
    private MedicationSchedule medicationSchedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medication_schedule_time_id")
    private MedicationScheduleTime medicationScheduleTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MedicationIntakeStatus status;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "taken_at")
    private LocalDateTime takenAt;

    @Builder
    public MedicationIntakeLog(
            MedicationSchedule medicationSchedule,
            MedicationScheduleTime medicationScheduleTime,
            MedicationIntakeStatus status,
            LocalDateTime scheduledAt,
            LocalDateTime takenAt
    ) {
        this.medicationSchedule = medicationSchedule;
        this.medicationScheduleTime = medicationScheduleTime;
        this.status = status;
        this.scheduledAt = scheduledAt;
        this.takenAt = takenAt;
    }

    public void update(
            MedicationSchedule medicationSchedule,
            MedicationScheduleTime medicationScheduleTime,
            MedicationIntakeStatus status,
            LocalDateTime scheduledAt,
            LocalDateTime takenAt
    ) {
        this.medicationSchedule = medicationSchedule;
        this.medicationScheduleTime = medicationScheduleTime;
        this.status = status;
        this.scheduledAt = scheduledAt;
        this.takenAt = takenAt;
    }
}
