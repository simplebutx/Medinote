package com.ibmteam02.backend_medication.pharmacy.domain;

import com.ibmteam02.backend_medication.pharmacy.dto.PharmacyRegisterRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "pharmacy",
        indexes = {
                @Index(name = "idx_pharmacy_hpid", columnList = "hpid", unique = true),
                @Index(name = "idx_pharmacy_latitude", columnList = "latitude"),
                @Index(name = "idx_pharmacy_longitude", columnList = "longitude")
        }
)
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
public class Pharmacy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String hpid;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(length = 32)
    private String phone;

    @Column(length = 8)
    private String postalCode;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "pharmacist_id")
    private Long pharmacistId;

    @Column(length = 4)
    private String mondayOpen;

    @Column(length = 4)
    private String mondayClose;

    @Column(length = 4)
    private String tuesdayOpen;

    @Column(length = 4)
    private String tuesdayClose;

    @Column(length = 4)
    private String wednesdayOpen;

    @Column(length = 4)
    private String wednesdayClose;

    @Column(length = 4)
    private String thursdayOpen;

    @Column(length = 4)
    private String thursdayClose;

    @Column(length = 4)
    private String fridayOpen;

    @Column(length = 4)
    private String fridayClose;

    @Column(length = 4)
    private String saturdayOpen;

    @Column(length = 4)
    private String saturdayClose;

    @Column(length = 4)
    private String sundayOpen;

    @Column(length = 4)
    private String sundayClose;

    @Column(length = 4)
    private String holidayOpen;

    @Column(length = 4)
    private String holidayClose;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String extraInfo;

    @Column(length = 255)
    private String mapImageUrl;

    @Column(length = 255)
    private String homepageUrl;

    public Pharmacy(
            String hpid,
            String name,
            String address,
            String phone,
            String postalCode,
            Double latitude,
            Double longitude,
            Long pharmacistId,
            String mondayOpen,
            String mondayClose,
            String tuesdayOpen,
            String tuesdayClose,
            String wednesdayOpen,
            String wednesdayClose,
            String thursdayOpen,
            String thursdayClose,
            String fridayOpen,
            String fridayClose,
            String saturdayOpen,
            String saturdayClose,
            String sundayOpen,
            String sundayClose,
            String holidayOpen,
            String holidayClose,
            String description,
            String extraInfo,
            String mapImageUrl,
            String homepageUrl
    ) {
        this.hpid = hpid;
        this.name = name;
        this.address = address;
        this.phone = phone;
        this.postalCode = postalCode;
        this.latitude = latitude;
        this.longitude = longitude;
        this.pharmacistId = pharmacistId;
        this.mondayOpen = mondayOpen;
        this.mondayClose = mondayClose;
        this.tuesdayOpen = tuesdayOpen;
        this.tuesdayClose = tuesdayClose;
        this.wednesdayOpen = wednesdayOpen;
        this.wednesdayClose = wednesdayClose;
        this.thursdayOpen = thursdayOpen;
        this.thursdayClose = thursdayClose;
        this.fridayOpen = fridayOpen;
        this.fridayClose = fridayClose;
        this.saturdayOpen = saturdayOpen;
        this.saturdayClose = saturdayClose;
        this.sundayOpen = sundayOpen;
        this.sundayClose = sundayClose;
        this.holidayOpen = holidayOpen;
        this.holidayClose = holidayClose;
        this.description = description;
        this.extraInfo = extraInfo;
        this.mapImageUrl = mapImageUrl;
        this.homepageUrl = homepageUrl;
    }

    public void updatePharmacy(PharmacyRegisterRequest request){
        this.address = request.getAddress();
        this.phone = request.getPhone();
        this.latitude = request.getLatitude();
        this.longitude = request.getLongitude();
        this.mondayOpen = request.getMondayOpen();
        this.mondayClose = request.getMondayClose();
        this.tuesdayOpen = request.getTuesdayOpen();
        this.tuesdayClose = request.getTuesdayClose();
        this.wednesdayOpen = request.getWednesdayOpen();
        this.wednesdayClose = request.getWednesdayClose();
        this.thursdayOpen = request.getThursdayOpen();
        this.thursdayClose = request.getThursdayClose();
        this.fridayOpen = request.getFridayOpen();
        this.fridayClose = request.getFridayClose();
        this.saturdayOpen = request.getSaturdayOpen();
        this.saturdayClose = request.getSaturdayClose();
        this.sundayOpen = request.getSundayOpen();
        this.sundayClose = request.getSundayClose();
        this.holidayOpen = request.getHolidayOpen();
        this.holidayClose = request.getHolidayClose();
    }
}
