package com.MyVoicePick.demo.dto;

import java.time.LocalDateTime;

/**
 * 애플리케이션에서 발생한 예외를 프론트엔드/클라이언트 측이 일관된 형태로 받아볼 수 있도록
 * 규격화(Standarization)한 에러 응답 객체입니다.
 *
 * [설계 의도]
 * 에러 정보는 한 번 응답을 내려주면 바뀌지 않아야 하므로 불변 객체인 Record를 사용했습니다.
 * 클라이언트 단에서는 HTTP 상태 코드뿐만 아니라 내부 정의된 'errorCode'를 통해
 * 다국어 처리나 특정 팝업 노출 여부를 결정할 수 있습니다.
 */
public record ErrorResponse(
        String errorCode,
        String message,
        LocalDateTime timestamp
) {
    /**
     * 무조건 현재 시간을 바인딩하여 생성해 주는 편리한 정적 팩토리 메서드
     */
    public static ErrorResponse of(String errorCode, String message) {
        return new ErrorResponse(errorCode, message, LocalDateTime.now());
    }
}
