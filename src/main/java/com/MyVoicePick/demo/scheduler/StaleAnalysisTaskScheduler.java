package com.MyVoicePick.demo.scheduler;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.MyVoicePick.demo.repository.AnalysisTaskRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * 끝나지 못한 분석 작업을 실패로 정리한다.
 *
 * 워커가 대기열에서 작업을 꺼낸 뒤 비정상 종료되면 메시지는 사라지고 상태는 PROCESSING에 남는다.
 * 이런 작업은 아무도 다시 처리하지 않으므로, 접수 후 제한 시간이 지나면 FAILED로 바꿔
 * 사용자가 결과 화면에서 무한 대기하지 않고 다시 요청할 수 있게 한다.
 */
@Slf4j
@Component
public class StaleAnalysisTaskScheduler {

    private static final List<AnalysisStatus> UNFINISHED = List.of(AnalysisStatus.PENDING, AnalysisStatus.PROCESSING);

    private final AnalysisTaskRepository analysisTaskRepository;
    private final long timeoutMinutes;

    public StaleAnalysisTaskScheduler(AnalysisTaskRepository analysisTaskRepository,
            @Value("${app.analysis.timeout-minutes:30}") long timeoutMinutes) {
        this.analysisTaskRepository = analysisTaskRepository;
        this.timeoutMinutes = timeoutMinutes;
    }

    @Scheduled(fixedDelayString = "${app.analysis.stale-check-interval-ms:60000}")
    @Transactional
    public void failStaleTasks() {
        LocalDateTime deadline = LocalDateTime.now().minusMinutes(timeoutMinutes);
        List<AnalysisTask> staleTasks = analysisTaskRepository.findByStatusInAndCreatedAtBefore(UNFINISHED, deadline);
        for (AnalysisTask task : staleTasks) {
            log.warn("[StaleAnalysisTaskScheduler] {}분 넘게 끝나지 않은 작업을 실패 처리합니다. taskUuid: {}, status: {}",
                    timeoutMinutes, task.getTaskUuid(), task.getStatus());
            task.failTask();
        }
    }
}
