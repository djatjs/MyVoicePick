package com.MyVoicePick.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

/**
 * 사용자로부터 전달받은 음원 파일을 실제 AWS S3 버킷에 업로드하는 서비스입니다.
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class S3Uploader {

    private final S3Client s3Client;
    private final software.amazon.awssdk.services.s3.presigner.S3Presigner s3Presigner;

    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${spring.cloud.aws.region.static}")
    private String region;

    /**
     * MultipartFile을 S3에 업로드하고 접근 가능한 URL을 반환합니다.
     * @param multipartFile 업로드할 파일
     * @return S3 URL
     */
    public String uploadFile(MultipartFile multipartFile) {
        // [보안] 1. 서버 측 파일 검증 수행
        com.MyVoicePick.demo.util.FileValidator.validateAudioFile(multipartFile);

        // [보안] 2. 원본 파일명을 버리고 랜덤 UUID + 확장자로만 파일명 구성
        // originalFilename은 확장자를 추출하기 위한 용도로만 사용합니다.
        String originalFilename = multipartFile.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String fileName = UUID.randomUUID().toString() + extension;

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(fileName)
                    .contentType(multipartFile.getContentType())
                    .build();

            // S3에 파일 업로드 실행
            s3Client.putObject(putObjectRequest, 
                    RequestBody.fromInputStream(multipartFile.getInputStream(), multipartFile.getSize()));

            log.info("S3 파일 업로드 완료. fileName: {}", fileName);

        } catch (IOException e) {
            log.error("S3 파일 업로드 중 IO 예외 발생", e);
            throw new RuntimeException("파일 업로드에 실패했습니다.", e);
        }

        // [보안 적용] 공개 URL 대신, 10분간만 유효한 Pre-signed URL을 생성하여 반환합니다.
        return generatePresignedUrl(fileName);
    }

    /**
     * S3 객체에 접근할 수 있는 임시 보안 URL을 생성합니다.
     */
    private String generatePresignedUrl(String fileName) {
        software.amazon.awssdk.services.s3.model.GetObjectRequest getObjectRequest = 
                software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(fileName)
                    .build();

        software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest presignRequest = 
                software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest.builder()
                    .signatureDuration(java.time.Duration.ofMinutes(10)) // 10분간 유효
                    .getObjectRequest(getObjectRequest)
                    .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }
}
