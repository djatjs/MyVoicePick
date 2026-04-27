package com.MyVoicePick.demo.entity;

/**
 * 음성 파일 분석 작업의 진행 상태를 정의하는 Enum 클래스입니다.
 *
 * [설계 의도]
 * 1. String 타입으로 DB에 직접 넣게 되면 오타(Human Error)가 발생할 수 있습니다. 
 *    이를 Enum으로 강제하여 안전하게 관리합니다.
 * 2. 총 4단계 상태를 가집니다.
 *    - PENDING: Redis 큐에 Task가 올라가고 아직 처리되기 전
 *    - PROCESSING: Python (AI) 서버가 큐에서 꺼내와서 분석 중
 *    - COMPLETED: 분석이 완료되어 MySQL DB에 결과가 업데이트됨
 *    - FAILED: 처리 중 에러 발생
 */
public enum AnalysisStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED
}
