package com.MyVoicePick.demo.scheduler;

import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.repository.AnalysisTaskRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class StaleAnalysisTaskSchedulerTest {

    private final AnalysisTaskRepository repository = mock(AnalysisTaskRepository.class);
    private final StaleAnalysisTaskScheduler scheduler = new StaleAnalysisTaskScheduler(repository, 30, 1440);

    private AnalysisTask task(AnalysisStatus status) {
        return AnalysisTask.builder().taskUuid("t").user(mock(User.class)).s3FileUrl("key").status(status).build();
    }

    @Test
    void failsStuckProcessingAndLostPendingTasks() {
        AnalysisTask stuck = task(AnalysisStatus.PROCESSING);
        AnalysisTask lost = task(AnalysisStatus.PENDING);
        when(repository.findStartedBefore(eq(AnalysisStatus.PROCESSING), any())).thenReturn(List.of(stuck));
        when(repository.findByStatusAndCreatedAtBefore(eq(AnalysisStatus.PENDING), any())).thenReturn(List.of(lost));

        scheduler.failStaleTasks();

        assertThat(stuck.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(lost.getStatus()).isEqualTo(AnalysisStatus.FAILED);
    }

    @Test
    void processingIsTimedFromStartAndWaitingGetsItsOwnLongerLimit() {
        LocalDateTime now = LocalDateTime.now();

        scheduler.failStaleTasks();

        ArgumentCaptor<LocalDateTime> processingDeadline = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> pendingDeadline = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(repository).findStartedBefore(eq(AnalysisStatus.PROCESSING), processingDeadline.capture());
        verify(repository).findByStatusAndCreatedAtBefore(eq(AnalysisStatus.PENDING), pendingDeadline.capture());
        // a queue that is hours long must not fail tasks just for waiting
        assertThat(processingDeadline.getValue()).isBetween(now.minusMinutes(30).minusSeconds(5), now.minusMinutes(30).plusSeconds(5));
        assertThat(pendingDeadline.getValue()).isBetween(now.minusHours(24).minusSeconds(5), now.minusHours(24).plusSeconds(5));
    }
}
