package com.ibmteam02.backend_medication.pharmacy.repository;

import com.ibmteam02.backend_medication.pharmacy.domain.Pharmacy;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PharmacyRepository extends JpaRepository<Pharmacy, Long> {

    Optional<Pharmacy> findByHpid(String hpid);

    @Query("""
            select p
            from Pharmacy p
            where p.latitude between :southLat and :northLat
              and p.longitude between :westLng and :eastLng
            order by p.name asc
            """)
    List<Pharmacy> findInBounds(
            @Param("southLat") double southLat,
            @Param("northLat") double northLat,
            @Param("westLng") double westLng,
            @Param("eastLng") double eastLng,
            Pageable pageable
    );
}
