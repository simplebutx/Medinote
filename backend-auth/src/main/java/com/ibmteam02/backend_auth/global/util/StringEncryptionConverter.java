package com.ibmteam02.backend_auth.global.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class StringEncryptionConverter implements AttributeConverter<String, String> {

    private EncryptionUtils getEncryptionUtils() {
        if (ApplicationContextProvider.getContext() != null) {
            return ApplicationContextProvider.getContext().getBean(EncryptionUtils.class);
        }
        return null;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        System.out.println("[StringConverter] ToDB: " + attribute);
        EncryptionUtils utils = getEncryptionUtils();
        if (utils == null) {
            System.err.println("[StringConverter Error] EncryptionUtils is NULL");
            return attribute;
        }
        return utils.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) return null;
        System.out.println("[StringConverter] FromDB: " + dbData);
        EncryptionUtils utils = getEncryptionUtils();
        if (utils == null) {
            System.err.println("[StringConverter Error] EncryptionUtils is NULL");
            return dbData;
        }
        
        try {
            return utils.decrypt(dbData);
        } catch (Exception e) {
            System.err.println("[StringConverter Warning] Decryption failed, returning raw data: " + dbData);
            return dbData;
        }
    }
}
