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
        String originalFilename = multipartFile.getOriginalFilename();
        
        // 파일명 중복 방지를 위해 고유 식별자(UUID)를 파일명 앞에 붙입니다.
        String fileName = UUID.randomUUID().toString() + "_" + originalFilename;

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

        // 업로드된 파일의 S3 URL 생성 후 반환
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, fileName);
    }
}
