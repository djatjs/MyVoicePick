package com.MyVoicePick.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.server.ResponseStatusException;

import com.MyVoicePick.demo.dto.TaskStatusResponse;
import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.repository.AnalysisTaskRepository;
import com.MyVoicePick.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

class AnalysisServiceStatusTest {

    private final AnalysisTaskRepository taskRepository = mock(AnalysisTaskRepository.class);
    private AnalysisService service;

    @BeforeEach
    void setUp() {
        service = new AnalysisService(mock(UserRepository.class), taskRepository, mock(StringRedisTemplate.class),
                new ObjectMapper(), mock(S3Uploader.class), mock(PlatformTransactionManager.class));
        User owner = mock(User.class);
        when(owner.getEmail()).thenReturn("owner@example.com");
        when(owner.getPlan()).thenReturn(com.MyVoicePick.demo.entity.UserPlan.values()[0]);
        AnalysisTask task = AnalysisTask.builder()
                .taskUuid("task-1").user(owner).s3FileUrl("key").status(AnalysisStatus.PROCESSING).build();
        when(taskRepository.findByTaskUuid("task-1")).thenReturn(Optional.of(task));
    }

    @Test
    void ownerCanReadTaskStatus() {
        TaskStatusResponse response = service.getTaskStatus("task-1", "owner@example.com");

        assertThat(response.status()).isEqualTo(AnalysisStatus.PROCESSING);
    }

    @Test
    void anotherUserGetsSameNotFoundAsMissingTask() {
        assertThatThrownBy(() -> service.getTaskStatus("task-1", "other@example.com"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> service.getTaskStatus("no-such-task", "other@example.com"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void anotherUserCannotDeleteAndGetsNotFound() {
        User other = mock(User.class);
        when(other.getId()).thenReturn(2L);
        AnalysisTask owned = taskRepository.findByTaskUuid("task-1").orElseThrow();
        when(owned.getUser().getId()).thenReturn(1L);

        assertThatThrownBy(() -> service.deleteAnalysisTask(2L, "task-1"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
