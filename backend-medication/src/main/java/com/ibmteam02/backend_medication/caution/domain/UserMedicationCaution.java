package com.ibmteam02.backend_medication.caution.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@Getter
public class UserMedicationCaution {

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

    @Column(columnDefinition = "TEXT")
    private String memo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public UserMedicationCaution(
            Long userId,
            Long itemSeq,
            String itemName,
            String ingredientCode,
            String ingredientName,
            Reason reason,
            String memo,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this.userId = userId;
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.ingredientCode = ingredientCode;
        this.ingredientName = ingredientName;
        this.reason = reason;
        this.memo = memo;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void update(
            Long itemSeq,
            String itemName,
            String ingredientCode,
            String ingredientName,
            Reason reason,
            String memo,
            LocalDateTime updatedAt
    ) {
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.ingredientCode = ingredientCode;
        this.ingredientName = ingredientName;
        this.reason = reason;
        this.memo = memo;
        this.updatedAt = updatedAt;
    }
}
