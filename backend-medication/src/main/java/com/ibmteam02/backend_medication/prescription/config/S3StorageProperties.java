package com.ibmteam02.backend_medication.prescription.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "aws.s3")
public record S3StorageProperties(
        String region,
        String bucket,
        String accessKey,
        String secretKey,
        String endpoint,
        String keyPrefix,
        long presignExpirationSeconds
) {
}
