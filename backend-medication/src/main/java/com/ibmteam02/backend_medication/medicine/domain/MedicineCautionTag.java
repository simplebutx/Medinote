package com.ibmteam02.backend_medication.medicine.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "medicine_caution_tag")
public class MedicineCautionTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long itemSeq;

    @Column(nullable = false, length = 100)
    private String tagCode;

    @Column(nullable = false, length = 100)
    private String tagName;

    @Column(columnDefinition = "TEXT")
    private String matchedKeywords;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public MedicineCautionTag(Long itemSeq, String tagCode, String tagName, String matchedKeywords) {
        this.itemSeq = itemSeq;
        this.tagCode = tagCode;
        this.tagName = tagName;
        this.matchedKeywords = matchedKeywords;
        this.updatedAt = LocalDateTime.now();
    }
}
