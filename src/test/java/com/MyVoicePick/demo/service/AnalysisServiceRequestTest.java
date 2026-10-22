package com.MyVoicePick.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.repository.AnalysisTaskRepository;
import com.MyVoicePick.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

class AnalysisServiceRequestTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AnalysisTaskRepository taskRepository = mock(AnalysisTaskRepository.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
    private AnalysisService service;

    @BeforeEach
    void setUp() {
        service = new AnalysisService(userRepository, taskRepository, redis, new ObjectMapper(),
                mock(S3Uploader.class), txManager);
        when(userRepository.findById(1L)).thenReturn(Optional.of(mock(User.class)));
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
    }

    @AfterEach
    void clear() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void publishFailureMarksTaskFailedInItsOwnTransaction() {
        @SuppressWarnings("unchecked")
        ListOperations<String, String> list = mock(ListOperations.class);
        when(redis.opsForList()).thenReturn(list);
        when(list.leftPush(anyString(), anyString())).thenThrow(new RedisConnectionFailureException("down"));
        when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // 커밋 직후 상황을 흉내 낸다: requestAnalysis가 등록한 afterCommit을 직접 실행
        TransactionSynchronizationManager.initSynchronization();
        String taskUuid = service.requestAnalysis(1L, "key");
        ArgumentCaptor<AnalysisTask> saved = ArgumentCaptor.forClass(AnalysisTask.class);
        Mockito.verify(taskRepository).save(saved.capture());
        when(taskRepository.findByTaskUuid(eq(taskUuid))).thenReturn(Optional.of(saved.getValue()));
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);

        assertThat(saved.getValue().getStatus()).isEqualTo(AnalysisStatus.FAILED);
        ArgumentCaptor<TransactionDefinition> def = ArgumentCaptor.forClass(TransactionDefinition.class);
        Mockito.verify(txManager).getTransaction(def.capture());
        assertThat(def.getValue().getPropagationBehavior())
                .isEqualTo(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        Mockito.verify(txManager).commit(any());
    }

    @Test
    void secondRequestWhileOneIsRunningIsRejectedWith429() {
        when(taskRepository.existsByUserIdAndStatusIn(eq(1L), any())).thenReturn(true);

        assertThatThrownBy(() -> service.checkNoActiveTask(1L))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    }

    @Test
    void requestIsAllowedWhenNothingIsRunning() {
        when(taskRepository.existsByUserIdAndStatusIn(eq(1L), any())).thenReturn(false);

        service.checkNoActiveTask(1L);
    }
}
