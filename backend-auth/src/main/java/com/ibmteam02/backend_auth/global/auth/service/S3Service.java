package com.mymedi.backend.global.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class S3Service {
    private final S3Client s3Client;

    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucket;

    public String upload(MultipartFile multipartFile) {
        if (multipartFile == null || multipartFile.isEmpty()){
            throw new IllegalArgumentException("이미지 파일은 필수입니다");
        }

        // S3 저장 경로 및 파일명 지정
        String s3FileName = "medication/images/" + UUID.randomUUID() + "-" + multipartFile.getOriginalFilename();

        try (InputStream inputStream = multipartFile.getInputStream()) {

            // AWS SDK v2 순정 업로드 요청 빌드
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(s3FileName)
                    .contentType(multipartFile.getContentType())
                    .build();

            // S3 버킷에 다이렉트로 파일 전송!
            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, multipartFile.getSize()));

            // 윤주님 기존 기획대로 생성된 경로(key) 반환
            return s3FileName;

        } catch (IOException e) {
            throw new RuntimeException("사진 업로드 에러", e);
        }
    }

}
