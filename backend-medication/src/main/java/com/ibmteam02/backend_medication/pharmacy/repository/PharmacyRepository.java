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

    @Query("""
            SELECT DISTINCT p
            FROM Pharmacy p
            JOIN PharmacyInventory i ON p.hpid = i.pharmacyHpid
            WHERE i.itemName LIKE %:itemName%
              AND i.stockQuantity > 0
            ORDER BY p.name ASC
            """)
    List<Pharmacy> findByMedicineStockInBounds(
            @Param("itemName") String itemName,
            @Param("southLat") double southLat,
            @Param("northLat") double northLat,
            @Param("westLng") double westLng,
            @Param("eastLng") double eastLng
    );


}
