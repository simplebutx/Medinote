package com.ibmteam02.backend_medication.caution.repository;

import com.ibmteam02.backend_medication.caution.domain.CautionType;
import com.ibmteam02.backend_medication.caution.domain.UserMedicationCaution;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserMedicationCautionRepository extends JpaRepository<UserMedicationCaution, Long> {

    List<UserMedicationCaution> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    List<UserMedicationCaution> findAllByUserIdAndCautionTypeOrderByCreatedAtDesc(Long userId, CautionType cautionType);

    List<UserMedicationCaution> findAllByUserIdAndCautionType(Long userId, CautionType cautionType);

    @Query("""
            select c
            from UserMedicationCaution c
            where c.userId = :userId
              and (
                    c.cautionType = com.ibmteam02.backend_medication.caution.domain.CautionType.MEDICINE
                    or (c.cautionType is null and c.itemName is not null)
                  )
            order by c.createdAt desc
            """)
    List<UserMedicationCaution> findAllMedicineCautionsByUserId(Long userId);

    @Query("""
            select c
            from UserMedicationCaution c
            where c.userId = :userId
              and (
                    c.cautionType = com.ibmteam02.backend_medication.caution.domain.CautionType.INGREDIENT
                    or (c.cautionType is null and c.ingredientName is not null)
                  )
            order by c.createdAt desc
            """)
    List<UserMedicationCaution> findAllIngredientCautionsByUserId(Long userId);
}
