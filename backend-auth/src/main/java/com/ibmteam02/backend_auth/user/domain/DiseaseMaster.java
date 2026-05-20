package com.ibmteam02.backend_auth.user.domain;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "disease_master")
public class DiseaseMaster {

    @Id
    @Column(name = "disease_code",length = 50)
    private String diseaseCode;

    @Column(name = "disease_name",nullable = false)
    private String diseaseName;

    @Builder
    public DiseaseMaster(String diseaseCode,String diseaseName){
        this.diseaseCode = diseaseCode;
        this.diseaseName = diseaseName;
    }
}
