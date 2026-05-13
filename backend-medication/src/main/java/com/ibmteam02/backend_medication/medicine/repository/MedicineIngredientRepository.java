package com.ibmteam02.backend_medication.medicine.repository;

import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MedicineIngredientRepository extends JpaRepository<MedicineIngredient, Long> {

    @Transactional
    void deleteByItemSeqIn(Collection<Long> itemSeqList);
}
