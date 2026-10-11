package com.MyVoicePick.demo.scheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.repository.AnalysisTaskRepository;

class StaleAnalysisTaskSchedulerTest {

    private final AnalysisTaskRepository repository = mock(AnalysisTaskRepository.class);
    private final StaleAnalysisTaskScheduler scheduler = new StaleAnalysisTaskScheduler(repository, 30);

    @Test
    void marksUnfinishedTasksOlderThanTimeoutAsFailed() {
        AnalysisTask stuck = AnalysisTask.builder()
                .taskUuid("stuck").user(mock(User.class)).s3FileUrl("key").status(AnalysisStatus.PROCESSING).build();
        when(repository.findByStatusInAndCreatedAtBefore(anyCollection(), any())).thenReturn(List.of(stuck));

        scheduler.failStaleTasks();

        assertThat(stuck.getStatus()).isEqualTo(AnalysisStatus.FAILED);
    }

    @Test
    @SuppressWarnings("unchecked")
    void looksOnlyAtPendingAndProcessingTasksPastTheDeadline() {
        when(repository.findByStatusInAndCreatedAtBefore(anyCollection(), any())).thenReturn(List.of());
        LocalDateTime before = LocalDateTime.now().minusMinutes(30);

        scheduler.failStaleTasks();

        ArgumentCaptor<Collection<AnalysisStatus>> statuses = ArgumentCaptor.forClass(Collection.class);
        ArgumentCaptor<LocalDateTime> deadline = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(repository).findByStatusInAndCreatedAtBefore(statuses.capture(), deadline.capture());
        assertThat(statuses.getValue()).containsExactlyInAnyOrder(AnalysisStatus.PENDING, AnalysisStatus.PROCESSING);
        assertThat(deadline.getValue()).isBetween(before.minusSeconds(5), before.plusSeconds(5));
    }
}
