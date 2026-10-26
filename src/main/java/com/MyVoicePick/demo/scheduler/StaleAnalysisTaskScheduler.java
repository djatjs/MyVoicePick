package com.MyVoicePick.demo.scheduler;

import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.MyVoicePick.demo.repository.AnalysisTaskRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 끝나지 못한 분석 작업을 FAILED로 정리한다.
 *
 * - 처리 중(PROCESSING): 처리를 시작한 지 timeoutMinutes(기본 30분)가 지나면 워커가 멈춘 것으로 본다.
 * - 대기 중(PENDING): 대기열에서 기다리는 시간은 요청이 몰리면 길어질 수 있으므로 처리 시간과 따로 본다.
 *   pendingTimeoutMinutes(기본 24시간)가 지나도 시작되지 않았다면 대기열 메시지를 잃은 것으로 본다.
 */
@Slf4j
@Component
public class StaleAnalysisTaskScheduler {

    private final AnalysisTaskRepository analysisTaskRepository;
    private final long timeoutMinutes;
    private final long pendingTimeoutMinutes;

    public StaleAnalysisTaskScheduler(AnalysisTaskRepository analysisTaskRepository,
            @Value("${app.analysis.timeout-minutes:30}") long timeoutMinutes,
            @Value("${app.analysis.pending-timeout-minutes:1440}") long pendingTimeoutMinutes) {
        this.analysisTaskRepository = analysisTaskRepository;
        this.timeoutMinutes = timeoutMinutes;
        this.pendingTimeoutMinutes = pendingTimeoutMinutes;
    }

    @Scheduled(fixedDelayString = "${app.analysis.stale-check-interval-ms:60000}")
    @Transactional
    public void failStaleTasks() {
        LocalDateTime now = LocalDateTime.now();
        List<AnalysisTask> staleTasks = new ArrayList<>(
                analysisTaskRepository.findStartedBefore(AnalysisStatus.PROCESSING, now.minusMinutes(timeoutMinutes)));
        staleTasks.addAll(analysisTaskRepository.findByStatusAndCreatedAtBefore(
                AnalysisStatus.PENDING, now.minusMinutes(pendingTimeoutMinutes)));
        for (AnalysisTask task : staleTasks) {
            log.warn("[StaleAnalysisTaskScheduler] 시간 안에 끝나지 않은 작업을 실패 처리합니다. taskUuid: {}, status: {}",
                    task.getTaskUuid(), task.getStatus());
            task.failTask();
        }
    }
}
