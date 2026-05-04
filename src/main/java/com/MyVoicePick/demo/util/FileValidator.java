package com.MyVoicePick.demo.util;

import org.springframework.web.multipart.MultipartFile;
import java.util.Arrays;
import java.util.List;

/**
 * 파일 업로드 시 보안 및 유효성 검증을 담당하는 유틸리티 클래스입니다.
 */
public class FileValidator {

    // 1. 허용할 확장자 화이트리스트 (대소문자 구분 없이 처리)
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("mp3", "wav", "m4a");
    
    // 2. 허용할 MIME 타입 화이트리스트 (브라우저가 전달하는 Content-Type 기반)
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "audio/mpeg", 
            "audio/wav", 
            "audio/x-wav", 
            "audio/x-m4a", 
            "audio/mp4", 
            "audio/aac"
    );

    /**
     * 오디오 파일의 유효성을 검증합니다.
     * @param file 업로드된 파일 객체
     * @throws IllegalArgumentException 검증 실패 시 원인 메시지와 함께 발생
     */
    public static void validateAudioFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드된 파일이 없습니다.");
        }

        // [검증 1] 파일명 및 확장자 체크
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new IllegalArgumentException("올바르지 않은 파일명입니다.");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("지원하지 않는 확장자입니다: " + extension + " (허용: mp3, wav, m4a)");
        }

        // [검증 2] MIME 타입 체크
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            // 참고: 사용자가 파일 확장자만 강제로 바꾼 경우 여기서 걸러질 확률이 높습니다.
            throw new IllegalArgumentException("유효하지 않은 오디오 형식(MIME)입니다: " + contentType);
        }

        // [검증 3] 용량 체크 (Application.yml 설정 외에 추가적인 코드 레벨 제어 필요 시)
        // if (file.getSize() > 50 * 1024 * 1024) { ... }
    }
}
