package com.ibmteam02.backend_auth.global.util;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class EncryptionUtils {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;
    private final byte[] key;


    public EncryptionUtils(@Value("${app.encryption.key:this-is-a-very-secret-key-32-chars!}") String secretKey) {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        this.key = new byte[32]; // 32바이트 공간 확보
        // 키가 길면 자르고, 짧으면 0으로 채워서 32바이트를 맞춤
        System.arraycopy(keyBytes, 0, this.key, 0, Math.min(keyBytes.length, 32));
    }

    public String encrypt(String plainText) {
        if (plainText == null) return null;
        try {
            System.out.println("[EncryptionUtils] Encrypting: " + plainText);
            //벡터 초기화, 생성될때마다 암호화 랜덤 설정
            byte[] iv = new byte[IV_LENGTH_BYTE];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), spec);

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // [IV (12 bytes)] + [암호문] 형태로 합쳐서 저장해야 나중에 복호화가 가능합니다.
            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
            byteBuffer.put(iv);
            byteBuffer.put(cipherText);

            return Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            System.err.println("[EncryptionUtils Error] Encryption failed for: " + plainText);
            e.printStackTrace();
            throw new RuntimeException("암호화 처리 중 오류가 발생했습니다.", e);
        }
    }


    /**
     * 양방향 복호화
     **/
    public String decrypt(String cipherText) {
        if (cipherText == null) return null;
        try {
            System.out.println("[EncryptionUtils] Decrypting: " + cipherText);
            byte[] decode = Base64.getDecoder().decode(cipherText);

            // 저장된 바이트 배열에서 IV(앞 12바이트)와 암호문(나머지)을 분리
            ByteBuffer byteBuffer = ByteBuffer.wrap(decode);
            byte[] iv = new byte[IV_LENGTH_BYTE];
            byteBuffer.get(iv);
            byte[] cipherBytes = new byte[byteBuffer.remaining()];
            byteBuffer.get(cipherBytes);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), spec);

            return new String(cipher.doFinal(cipherBytes), StandardCharsets.UTF_8);
        } catch (Exception e) {
            System.err.println("[EncryptionUtils Error] Decryption failed for: " + cipherText);
            e.printStackTrace();
            throw new RuntimeException("복호화 처리 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 단방향 해시
     **/
    public String hash(String plainText) {
        if (plainText == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("해시 알고리즘 생성 중 오류가 발생했습니다.", e);
        }
    }

}
