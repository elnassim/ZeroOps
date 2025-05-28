package com.example.zeroops.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody; // For uploading from Path

import java.io.File;

@Service
public class StorageService {

    private static final Logger logger = LoggerFactory.getLogger(StorageService.class);
    private final S3Client s3Client;
    private final String bucketName;

    public StorageService(S3Client s3Client,
                          @Value("${aws.s3.bucketName}") String bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
    }

    public void uploadFile(String s3Key, File file) {
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromFile(file));
            logger.info("Successfully uploaded {} to S3 bucket {} with key {}", file.getName(), bucketName, s3Key);
        } catch (SdkException e) {
            logger.error("Failed to upload file {} to S3 with key {}: {}", file.getName(), s3Key, e.getMessage(), e);
            // Consider re-throwing a custom exception or handling it as per your application's error strategy
            throw new RuntimeException("S3 Upload failed for file: " + file.getName() + " with key: " + s3Key, e);
        }
    }
}