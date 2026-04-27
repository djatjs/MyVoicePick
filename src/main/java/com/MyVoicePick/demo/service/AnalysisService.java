package com.MyVoicePick.demo.service;

import com.MyVoicePick.demo.dto.TaskStatusResponse;
import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.repository.AnalysisTaskRepository;
import com.MyVoicePick.demo.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 음성 분석 요청 및 상태 관리를 담당하는 핵심 비즈니스 로직 Service 입니다.
 *
 * [설계 의도]
 * 1. 클래스 레벨에 @Transactional(readOnly = true)를 걸어두어, 단순히 데이터를 읽기만 하는 getTaskStatus() 같은 메서드에서 불필요한 트랜잭션 오버헤드를 줄입니다.
 * 2. CUD (생성/수정/삭제) 작업이 일어나는 requestAnalysis() 메서드에는 명시적으로 @Transactional을 덮어씌워 데이터베이스 무결성을 보장합니다.
 */
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
     * @param userId 클라이언트 사용자 ID
     * @param s3FileUrl S3에 업로드 완료된 파일의 URL 경로
     * @return 클라이언트가 추후 폴링(상태 확인)할 때 사용할 영수증 ID(UUID)
     */
    @Transactional
    public String requestAnalysis(Long userId, String s3FileUrl) {
        // 1. 유저 검증
        // 에러 처리: 식별되지 않은 사용자의 요청을 원천 차단합니다.
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다. User ID: " + userId));

        // 2. 작업 내역 생성 및 DB 보관 (객체 생성 로직은 Entity 내부로 캡슐화)
        AnalysisTask task = AnalysisTask.create(user, s3FileUrl);
        String taskUuid = task.getTaskUuid(); // 발급된 영수증 식별자 꺼내기
        
        analysisTaskRepository.save(task);

        // 4. Redis Task Queue 연동 (파이썬 AI 서버로 메시지 발행)
        // 파운데이션(Python) 쪽에서 쉽게 파싱할 수 있도록 Map 객체를 구성한 뒤 JSON 문자열로 직렬화합니다.
        Map<String, String> payload = new HashMap<>();
        payload.put("taskId", taskUuid);
        payload.put("s3FileUrl", s3FileUrl);

        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            
            // Queue 정책: LPUSH를 통해 리스트의 왼쪽으로 밀어 넣습니다.
            // (파이썬 서버는 BRPOP 혹은 RPOP을 통해 오른쪽에서 순차적으로 꺼내가야 FIFO 구조가 완성됩니다)
            stringRedisTemplate.opsForList().leftPush("voice_analysis_queue", jsonPayload);
        } catch (JsonProcessingException e) {
            // 직렬화 과정에서 에러가 발생한 경우 RuntimeException으로 던져서, 
            // 현재 진행 중인 @Transactional이 데이터를 DB에 적재하는 행위 자체를 통째로 롤백(Rollback)시킵니다.
            throw new RuntimeException("Redis 큐 적재를 위한 JSON 직렬화에 실패하여 분석 작업이 생성되지 않았습니다.", e);
        }

        return taskUuid;
    }

    /**
     * 클라이언트가 주기적으로(Polling) 영수증 번호를 이용해 작업 상태를 확인하는 로직입니다.
     */
    public TaskStatusResponse getTaskStatus(String taskUuid) {
        // UUID를 기반으로 작업 조회 (없으면 즉시 클라이언트에게 에러 반환)
        AnalysisTask task = analysisTaskRepository.findByTaskUuid(taskUuid)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않거나 유효하지 않은 작업 ID입니다. Task UUID: " + taskUuid));

        // 앞서 작성한 DTO(Record) 내부의 정적 팩토리 메서드를 호출하여 깔끔하게 반환!
        return TaskStatusResponse.from(task);
    }
}
