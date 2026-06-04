package com.ibmteam02.backend_medication.schedule.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_time_preset")

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserTimePreset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "times_per_day", nullable = false)
    private Integer timesPerDay;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "take_time", nullable = false)
    private LocalTime takeTime;

    @Builder
    public UserTimePreset(Long userId, Integer timesPerDay, Integer sortOrder, LocalTime takeTime) {
        this.userId = userId;
        this.timesPerDay = timesPerDay;
        this.sortOrder = sortOrder;
        this.takeTime = takeTime;
    }
}
