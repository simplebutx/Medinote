package com.ibmteam02.backend_medication.prescription.config;

import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;

@Configuration
@RequiredArgsConstructor
public class S3ClientConfig {

    private static final String DEFAULT_REGION = "ap-northeast-2";

    private final S3StorageProperties s3StorageProperties;

    @Bean
    public S3Client s3Client() {
        String region = StringUtils.hasText(s3StorageProperties.region())
                ? s3StorageProperties.region()
                : DEFAULT_REGION;

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region));

        if (StringUtils.hasText(s3StorageProperties.accessKey())
                && StringUtils.hasText(s3StorageProperties.secretKey())) {
            builder.credentialsProvider(
                    StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(
                                    s3StorageProperties.accessKey(),
                                    s3StorageProperties.secretKey()
                            )
                    )
            );
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        if (StringUtils.hasText(s3StorageProperties.endpoint())) {
            builder.endpointOverride(URI.create(s3StorageProperties.endpoint()));
        }

        return builder.build();
    }
}