package com.ibmteam02.backend_medication.caution.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class UserMedicationCaution {

    private static final ZoneId SCHEDULE_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    private Long itemSeq;
    private String itemName;
    private String ingredientCode;
    private String ingredientName;

    @Enumerated(EnumType.STRING)
    private Reason reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CautionType cautionType;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public UserMedicationCaution(
            Long userId,
            Long itemSeq,
            String itemName,
            String ingredientCode,
            String ingredientName,
            Reason reason,
            CautionType cautionType,
            String memo
    ) {
        this.userId = userId;
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.ingredientCode = ingredientCode;
        this.ingredientName = ingredientName;
        this.reason = reason;
        this.cautionType = cautionType;
        this.memo = memo;
    }

    public void update(
            Long itemSeq,
            String itemName,
            String ingredientCode,
            String ingredientName,
            Reason reason,
            CautionType cautionType,
            String memo
    ) {
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.ingredientCode = ingredientCode;
        this.ingredientName = ingredientName;
        this.reason = reason;
        this.cautionType = cautionType;
        this.memo = memo;
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
