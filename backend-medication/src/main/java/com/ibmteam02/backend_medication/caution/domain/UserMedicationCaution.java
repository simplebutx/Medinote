package com.ibmteam02.backend_medication.caution.domain;

import com.ibmteam02.backend_medication.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Getter
public class UserMedicationCaution extends BaseTimeEntity {

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

    public UserMedicationCaution(
            Long userId,
            Long itemSeq,
            String itemName,
            String ingredientCode,
            String ingredientName,
            Reason reason,
            String memo
    ) {
        this.userId = userId;
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.ingredientCode = ingredientCode;
        this.ingredientName = ingredientName;
        this.reason = reason;
        this.memo = memo;
    }

    public void update(
            Long itemSeq,
            String itemName,
            String ingredientCode,
            String ingredientName,
            Reason reason,
            String memo
    ) {
        this.itemSeq = itemSeq;
        this.itemName = itemName;
        this.ingredientCode = ingredientCode;
        this.ingredientName = ingredientName;
        this.reason = reason;
        this.memo = memo;
    }
}
