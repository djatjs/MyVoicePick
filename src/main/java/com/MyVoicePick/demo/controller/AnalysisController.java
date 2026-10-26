package com.MyVoicePick.demo.controller;

import com.MyVoicePick.demo.dto.TaskStatusResponse;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.repository.UserRepository;
import com.MyVoicePick.demo.service.AnalysisService;
import com.MyVoicePick.demo.service.S3Uploader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.Map;

/**
 * 분석(analysis) 자원을 다루는 REST Controller 입니다.
 *
 * POST   /api/v1/analyses          분석 요청 (202 + Location)
 * GET    /api/v1/analyses          내 분석 목록 (최신순, size로 개수 제한)
 * GET    /api/v1/analyses/{id}     분석 상태·결과
 * DELETE /api/v1/analyses/{id}     분석 삭제 (204)
 *
 * /api/v1/analyze/** 는 예전 주소입니다. 배포된 프론트가 새 주소로 바뀔 때까지만 같이 받습니다.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;
    private final S3Uploader s3Uploader;
    private final UserRepository userRepository;

    /**
     * 분석 요청. 분석은 워커가 비동기로 하므로 202와 함께 결과를 확인할 주소(Location)를 돌려줍니다.
     */
    @PostMapping({"/analyses", "/analyze"})
    public ResponseEntity<Map<String, String>> createAnalysis(@RequestParam("file") MultipartFile file,
                                                              @AuthenticationPrincipal String userEmail) {
        User user = currentUser(userEmail);

        // 진행 중인 작업이 있으면 업로드 전에 거절한다 (429)
        analysisService.checkNoActiveTask(user.getId());

        String s3Key = s3Uploader.uploadFile(file);
        String taskUuid = analysisService.requestAnalysis(user.getId(), s3Key);

        return ResponseEntity.accepted()
                .location(URI.create("/api/v1/analyses/" + taskUuid))
                .body(Map.of("taskId", taskUuid));
    }

    /**
     * 내 분석 목록. 최신순이며 size를 주면 그 개수만 돌려줍니다(최신 1건은 size=1).
     */
    @GetMapping("/analyses")
    public ResponseEntity<List<TaskStatusResponse>> listAnalyses(@RequestParam(name = "size", required = false) Integer size,
                                                                 @AuthenticationPrincipal String userEmail) {
        if (size != null && size < 1) {
            throw new IllegalArgumentException("size는 1 이상이어야 합니다.");
        }
        List<TaskStatusResponse> analyses = analysisService.getAnalysisHistory(currentUser(userEmail).getId());
        return ResponseEntity.ok(size == null ? analyses : analyses.stream().limit(size).toList());
    }

    /**
     * 분석 상태와 결과. 없거나 다른 사용자의 분석이면 404입니다.
     */
    @GetMapping({"/analyses/{taskId}", "/analyze/{taskId}/status"})
    public ResponseEntity<TaskStatusResponse> getAnalysis(@PathVariable("taskId") String taskId,
                                                          @AuthenticationPrincipal String userEmail) {
        return ResponseEntity.ok(analysisService.getTaskStatus(taskId, userEmail));
    }

    @DeleteMapping({"/analyses/{taskId}", "/analyze/{taskId}"})
    public ResponseEntity<Void> deleteAnalysis(@PathVariable("taskId") String taskId,
                                               @AuthenticationPrincipal String userEmail) {
        analysisService.deleteAnalysisTask(currentUser(userEmail).getId(), taskId);
        return ResponseEntity.noContent().build();
    }

    /** 예전 주소: GET /api/v1/analyses 로 대체. 프론트 배포 후 삭제. */
    @GetMapping("/analyze/my-history")
    public ResponseEntity<List<TaskStatusResponse>> legacyHistory(@AuthenticationPrincipal String userEmail) {
        return ResponseEntity.ok(analysisService.getAnalysisHistory(currentUser(userEmail).getId()));
    }

    /** 예전 주소: GET /api/v1/analyses?size=1 로 대체. 프론트 배포 후 삭제. */
    @GetMapping("/analyze/my-latest")
    public ResponseEntity<TaskStatusResponse> legacyLatest(@AuthenticationPrincipal String userEmail) {
        return ResponseEntity.ok(analysisService.getLatestAnalysisResult(currentUser(userEmail).getId()));
    }

    // 토큰은 유효한데 계정이 지워진 경우: 서버 오류(500)가 아니라 인증 실패로 응답
    private User currentUser(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "사용자를 찾을 수 없습니다."));
    }
}
