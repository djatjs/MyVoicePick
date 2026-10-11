package com.MyVoicePick.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;

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
                new ObjectMapper(), mock(S3Uploader.class));
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
    void anotherUserGetsSameErrorAsMissingTask() {
        assertThatThrownBy(() -> service.getTaskStatus("task-1", "other@example.com"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.getTaskStatus("no-such-task", "other@example.com"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
