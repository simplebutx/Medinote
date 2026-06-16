package com.ibmteam02.backend_auth.global.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * LocalDate 타입을 DB에 저장할 때 암호화된 String으로 변환하고,
 * DB에서 읽어올 때 복호화하여 다시 LocalDate로 변환하는 컨버터입니다.
 */
@Converter
public class LocalDateEncryptionConverter implements AttributeConverter<LocalDate, String> {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    //암호화 도구
    private EncryptionUtils getEncryptionUtils() {
        if (ApplicationContextProvider.getContext() != null) {
            return ApplicationContextProvider.getContext().getBean(EncryptionUtils.class);
        }
        return null;
    }

    //LocalDate 타입 암호화(Java → DB: 암호화)
    @Override
    public String convertToDatabaseColumn(LocalDate attribute) {
        if (attribute == null) return null;
        System.out.println("[LocalDateConverter] ToDB: " + attribute);
        EncryptionUtils utils = getEncryptionUtils();
        if (utils == null) {
            System.err.println("[LocalDateConverter Error] EncryptionUtils is NULL");
            return attribute.format(FORMATTER);
        }

        // 날짜를 ISO 형식(yyyy-MM-dd) 문자열로 바꾼 뒤 암호화
        return utils.encrypt(attribute.format(FORMATTER));
    }

    @Override
    public LocalDate convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        System.out.println("[LocalDateConverter] FromDB: " + dbData);
        EncryptionUtils utils = getEncryptionUtils();
        if (utils == null) {
            System.err.println("[LocalDateConverter Error] EncryptionUtils is NULL");
            return LocalDate.parse(dbData, FORMATTER);
        }

        try {
            // 복호화 후 다시 LocalDate로 파싱
            String decrypted = utils.decrypt(dbData);
            return LocalDate.parse(decrypted, FORMATTER);
        } catch (Exception e) {
            System.err.println("[LocalDateConverter Warning] Decryption failed, returning raw data: " + dbData);
            // 복호화 실패 시 (기존에 평문으로 저장되어 있던 경우) 그대로 파싱 시도
            try {
                return LocalDate.parse(dbData, FORMATTER);
            } catch (Exception ex) {
                return null;
            }
        }
    }


}







