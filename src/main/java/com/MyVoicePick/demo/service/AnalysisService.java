package com.MyVoicePick.demo.service;

import com.MyVoicePick.demo.dto.TaskStatusResponse;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.repository.AnalysisTaskRepository;
import com.MyVoicePick.demo.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.HashMap;
import java.util.Map;

/**
 * 음성 분석 요청 및 상태 관리를 담당하는 핵심 비즈니스 로직 Service 입니다.
 *
 * [레이스 컨디션 해결 전략]
 * 기존 문제: save() 직후 바로 Redis에 메시지를 발행하면,
 *   DB 트랜잭션 커밋이 완료되기 전에 파이썬 워커가 메시지를 수신하여
 *   DB에서 Task를 조회했을 때 "없음" 에러가 발생하는 레이스 컨디션 발생.
 *
 * 해결 방법: TransactionSynchronizationManager.registerSynchronization()을 사용하여
 *   afterCommit() 콜백에서 Redis 메시지를 발행합니다.
 *   이렇게 하면 DB 커밋이 100% 완료된 이후에만 파이썬 워커에게 신호가 전달됩니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalysisService {

    private final UserRepository userRepository;
    private final AnalysisTaskRepository analysisTaskRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 클라이언트의 분석 요청을 접수하고 대기 상태(PENDING)의 작업을 생성합니다.
     *
     * @param userId    클라이언트 사용자 ID
     * @param s3FileUrl S3에 업로드 완료된 파일의 URL 경로
     * @return 클라이언트가 추후 폴링(상태 확인)할 때 사용할 영수증 ID(UUID)
     */
    @Transactional
    public String requestAnalysis(Long userId, String s3FileUrl) {
        // 1. 유저 검증 - 식별되지 않은 사용자의 요청을 원천 차단
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다. User ID: " + userId));

        // 2. Task 생성 및 DB 저장 (객체 생성 로직은 Entity 내부로 캡슐화)
        AnalysisTask task = AnalysisTask.create(user, s3FileUrl);
        final String taskUuid = task.getTaskUuid();

        analysisTaskRepository.save(task);

        // 3. [핵심 수정] DB 커밋 완료 후에 Redis 메시지를 발행합니다.
        //
        // [설계 의도 - 레이스 컨디션 방어]
        // - 기존: save() → Redis 발행 → [트랜잭션 커밋] 순서로 동작
        //   → 커밋 전에 파이썬이 메시지 수신 → DB 조회 실패 에러 발생
        //
        // - 변경: save() → [트랜잭션 커밋] → afterCommit() 콜백에서 Redis 발행
        //   → DB에 Task가 확실히 존재한 이후에만 파이썬에게 신호 전달
        //   → 레이스 컨디션 원천 차단
        //
        // TransactionSynchronizationManager: 현재 트랜잭션의 생명주기에 콜백을 등록하는 Spring 내장 도구
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                // 이 블록은 트랜잭션이 성공적으로 커밋된 이후에만 실행됩니다.
                publishToRedis(taskUuid, s3FileUrl);
            }
        });

        return taskUuid;
    }

    /**
     * Redis 큐에 분석 작업 메시지를 발행합니다.
     * 반드시 트랜잭션 커밋 이후에 호출되어야 합니다. (afterCommit 콜백에서 호출)
     */
    private void publishToRedis(String taskUuid, String s3FileUrl) {
        Map<String, String> payload = new HashMap<>();
        payload.put("taskId", taskUuid);
        payload.put("s3FileUrl", s3FileUrl);

        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            // LPUSH: 리스트 왼쪽에 삽입. 파이썬은 BRPOP(오른쪽에서 꺼냄)으로 FIFO 순서 유지
            stringRedisTemplate.opsForList().leftPush("voice_analysis_queue", jsonPayload);
            log.info("[AnalysisService] DB 커밋 완료 후 Redis 발행 성공. taskUuid: {}", taskUuid);
        } catch (JsonProcessingException e) {
            // 직렬화 실패: 트랜잭션은 이미 커밋되었으므로 롤백 불가.
            // 로그를 남기고 모니터링 시스템에 알림 전송이 필요한 지점입니다.
            log.error("[AnalysisService] Redis 발행 실패! DB에는 저장되었으나 파이썬 워커로 전달되지 않았습니다. taskUuid: {}", taskUuid, e);
        }
    }

    /**
     * 클라이언트가 주기적으로(Polling) 영수증 번호를 이용해 작업 상태를 확인하는 로직입니다.
     */
    public TaskStatusResponse getTaskStatus(String taskUuid) {
        AnalysisTask task = analysisTaskRepository.findByTaskUuid(taskUuid)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 유효하지 않은 작업 ID입니다. Task UUID: " + taskUuid));

        return TaskStatusResponse.from(task);
    }
}
