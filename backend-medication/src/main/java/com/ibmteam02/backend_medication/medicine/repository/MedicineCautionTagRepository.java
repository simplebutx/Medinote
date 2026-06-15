package com.ibmteam02.backend_medication.medicine.repository;

import com.ibmteam02.backend_medication.medicine.domain.MedicineCautionTag;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MedicineCautionTagRepository extends JpaRepository<MedicineCautionTag, Long> {

    List<MedicineCautionTag> findByItemSeq(Long itemSeq);

    List<MedicineCautionTag> findByItemSeqIn(Collection<Long> itemSeqList);

    void deleteByItemSeqIn(Collection<Long> itemSeqList);
}
