package com.ibmteam02.backend_medication.prescription.cache;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
@RequiredArgsConstructor
public class OcrResultCacheRepository {

    private static final String SEQUENCE_KEY = "ocr:result:sequence";
    private static final String KEY_PREFIX = "ocr:result:";
    private static final Duration OCR_RESULT_TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // OCR 작업 ID를 새로 발급 (auto increment)
    public Long nextId() {
        Long nextId = redisTemplate.opsForValue().increment(SEQUENCE_KEY);
        if (nextId == null) {
            throw new IllegalStateException("Failed to create OCR result id.");
        }
        return nextId;
    }

    // 저장
    public void save(OcrResultCache ocrResult) {
        try {
            String json = objectMapper.writeValueAsString(ocrResult);
            redisTemplate.opsForValue().set(key(ocrResult.ocrResultId()), json, OCR_RESULT_TTL);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to save OCR result to Redis.", exception);
        }
    }

    // id로 조회
    public OcrResultCache findById(Long ocrResultId) {
        String json = redisTemplate.opsForValue().get(key(ocrResultId));
        if (json == null) {
            return null;
        }

        try {
            return objectMapper.readValue(json, OcrResultCache.class);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to read OCR result from Redis.", exception);
        }
    }

    public void deleteById(Long ocrResultId) {
        redisTemplate.delete(key(ocrResultId));
    }

    private String key(Long ocrResultId) {
        return KEY_PREFIX + ocrResultId;
    }
}
