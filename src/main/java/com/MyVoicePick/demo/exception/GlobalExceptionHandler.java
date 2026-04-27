package com.MyVoicePick.demo.exception;

import com.MyVoicePick.demo.dto.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 백엔드 애플리케이션 전반에서 던져지는 예외(Exception)들을 한 곳에서 낚아채어(Catch),
 * 클라이언트에게 규격화된 ErrorResponse 형태의 JSON 응답으로 변환해 주는 글로벌 에러 처리 계층입니다.
 *
 * [설계 의도]
 * Controller나 Service 내부를 지저분한 try-catch 블록으로 도배할 필요 없이,
 * 에러 발생 시 그저 throw new XXXException("메시지")만 던지면 이곳에서 AOP 기반으로 깔끔하게 처리됩니다.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 1. 클라이언트 귀책 사유 (400 Bad Request)
     * 예) 존재하지 않는 userId 조회, 잘못된 파라미터 전달 시 발생하는 IllegalArgumentException 처리
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException e) {
        // 비즈니스 로직에 어긋난 접근이므로 warn 레벨로만 가볍게 로깅
        log.warn("[BAD_REQUEST] {}", e.getMessage());
        
        ErrorResponse response = ErrorResponse.of("BAD_REQUEST", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * 2. 서버 귀책 사유 (500 Internal Server Error)
     * 예) DB 장애, Redis 직렬화 실패 등 예측하지 못한 심각한 런타임 오류 처리
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException e) {
        // 서버 파운데이션 라인의 문제이므로, 개발자가 즉각 확인할 수 있게 error 레벨 및 전체 스택트레이스 로깅
        log.error("[SERVER_ERROR] 서버 내부 로직 처리 중 문제가 발생했습니다: {}", e.getMessage(), e);
        
        // 주의: 클라이언트에게는 스택트레이스 등 민감 정보가 털리지 않게 메시지만 정제해서 반환
        ErrorResponse response = ErrorResponse.of("SERVER_ERROR", e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
