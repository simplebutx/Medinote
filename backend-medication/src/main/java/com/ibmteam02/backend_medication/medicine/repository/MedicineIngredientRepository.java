package com.ibmteam02.backend_medication.medicine.repository;

import com.ibmteam02.backend_medication.medicine.domain.MedicineIngredient;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MedicineIngredientRepository extends JpaRepository<MedicineIngredient, Long> {

    List<MedicineIngredient> findByItemSeq(Long itemSeq);

    @Transactional
    void deleteByItemSeqIn(Collection<Long> itemSeqList);
    List<MedicineIngredient> findTop10ByIngredientNameContaining(String keyword);
    Optional<MedicineIngredient> findTopByIngredientName(String ingredientName);
}
