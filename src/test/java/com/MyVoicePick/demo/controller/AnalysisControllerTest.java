package com.MyVoicePick.demo.controller;

import com.MyVoicePick.demo.dto.TaskStatusResponse;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.exception.GlobalExceptionHandler;
import com.MyVoicePick.demo.repository.UserRepository;
import com.MyVoicePick.demo.service.AnalysisService;
import com.MyVoicePick.demo.service.S3Uploader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AnalysisControllerTest {

    private final AnalysisService analysisService = mock(AnalysisService.class);
    private final S3Uploader s3Uploader = mock(S3Uploader.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(1L);
        // no security filter here, so the principal is null; any lookup resolves to this user
        when(userRepository.findByEmail(any())).thenReturn(Optional.of(user));
        mvc = MockMvcBuilders.standaloneSetup(new AnalysisController(analysisService, s3Uploader, userRepository))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    private static TaskStatusResponse result(String id) {
        return new TaskStatusResponse(id, null, null, null, null, null, List.of(), null, null, null, null, null, null, null);
    }

    @Test
    void createReturns202WithLocationOfTheNewAnalysis() throws Exception {
        when(s3Uploader.uploadFile(any())).thenReturn("key");
        when(analysisService.requestAnalysis(1L, "key")).thenReturn("abc");
        MockMultipartFile file = new MockMultipartFile("file", "a.mp3", "audio/mpeg", new byte[]{1});

        for (String path : new String[]{"/api/v1/analyses", "/api/v1/analyze"}) {
            mvc.perform(multipart(path).file(file))
                    .andExpect(status().isAccepted())
                    .andExpect(header().string("Location", "/api/v1/analyses/abc"))
                    .andExpect(jsonPath("$.taskId").value("abc"));
        }
    }

    @Test
    void listIsNewestFirstAndSizeLimitsIt() throws Exception {
        when(analysisService.getAnalysisHistory(1L)).thenReturn(List.of(result("new"), result("old")));

        mvc.perform(get("/api/v1/analyses")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/analyses").param("size", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].taskId").value("new"));
        mvc.perform(get("/api/v1/analyses").param("size", "0")).andExpect(status().isBadRequest());
    }

    @Test
    void readsOneAnalysisOnNewAndOldPathsAndMissingIs404() throws Exception {
        when(analysisService.getTaskStatus(eqStr("abc"), any())).thenReturn(result("abc"));
        when(analysisService.getTaskStatus(eqStr("nope"), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "없음"));

        mvc.perform(get("/api/v1/analyses/abc")).andExpect(status().isOk()).andExpect(jsonPath("$.taskId").value("abc"));
        mvc.perform(get("/api/v1/analyze/abc/status")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/analyses/nope")).andExpect(status().isNotFound());
    }

    @Test
    void deleteReturns204() throws Exception {
        mvc.perform(delete("/api/v1/analyses/abc")).andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/analyze/abc")).andExpect(status().isNoContent());
        verify(analysisService, times(2)).deleteAnalysisTask(1L, "abc");
    }

    private static String eqStr(String value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
