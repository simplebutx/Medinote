package com.ibmteam02.backend_medication.smartpill.domain;

import com.ibmteam02.backend_medication.schedule.domain.MedicationScheduleTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "smart_pill_slot_assignment",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_smart_pill_slot_schedule_time",
                columnNames = {"smart_pill_device_id", "slot_number", "medication_schedule_time_id"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SmartPillSlotAssignment {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "smart_pill_device_id", nullable = false)
    private SmartPillDevice device;

    @Column(name = "slot_number", nullable = false)
    private Integer slotNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_schedule_time_id", nullable = false)
    private MedicationScheduleTime medicationScheduleTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder
    public SmartPillSlotAssignment(
            SmartPillDevice device,
            Integer slotNumber,
            MedicationScheduleTime medicationScheduleTime
    ) {
        this.device = device;
        this.slotNumber = slotNumber;
        this.medicationScheduleTime = medicationScheduleTime;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now(SCHEDULE_ZONE);
    }
}
