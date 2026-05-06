package com.MyVoicePick.demo.controller;

import com.MyVoicePick.demo.dto.TaskStatusResponse;
import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.repository.UserRepository;
import com.MyVoicePick.demo.service.AnalysisService;
import com.MyVoicePick.demo.service.S3Uploader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

/**
 * 클라이언트의 백엔드 진입점 역할을 하는 REST Controller 입니다.
 */
@RestController
@RequestMapping("/api/v1/analyze")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;
    private final S3Uploader s3Uploader;
    private final UserRepository userRepository;

    /**
     * [엔드포인트 1] 음성 파일 분석 요청 (비동기)
     * 클라이언트가 음성 파일을 업로드하면 즉시 분석 결과가 나오지 않으므로, HTTP 202 Accepted와 함께 추적용 영수증을 반환합니다.
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> requestAnalysis(
            @RequestParam("file") MultipartFile file) {
        // 1. 현재 로그인한 사용자의 이메일 확보 (JwtAuthenticationFilter에서 저장함)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = (String) authentication.getPrincipal();

        // 2. 이메일을 통해 DB에서 User 엔티티 조회
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));

        // 3. S3에 실제 파일 업로드
        String s3Key = s3Uploader.uploadFile(file);

        // 4. 서비스 호출 (조회한 User의 실제 ID 사용)
        String taskUuid = analysisService.requestAnalysis(user.getId(), s3Key);

        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("taskId", taskUuid);

        return ResponseEntity.accepted().body(responseBody);
    }

    /**
     * [엔드포인트 2] 작업 상태 조회 (Polling)
     * 클라이언트가 발급받은 영수증(UUID)으로 상태를 지속적으로 물어봅니다.
     */
    @GetMapping("/{taskId}/status")
    public ResponseEntity<TaskStatusResponse> getTaskStatus(
            @PathVariable("taskId") String taskId) {
        // 비즈니스 로직(DB 검증, 상태 체크, 매핑)은 모두 Service와 DTO에서 우아하게 처리했으므로
        // 컨트롤러는 아주 가볍게 의존성만 넘겨줍니다. (Controller는 우편배달부 역할에만 충실해야 함)
        TaskStatusResponse response = analysisService.getTaskStatus(taskId);
        return ResponseEntity.ok(response);
    }

    /**
     * [엔드포인트 3] 나의 최신 분석 결과 조회 (마이페이지용)
     */
    @GetMapping("/my-latest")
    public ResponseEntity<TaskStatusResponse> getLatestAnalysis() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = (String) authentication.getPrincipal();

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));

        TaskStatusResponse response = analysisService.getLatestAnalysisResult(user.getId());
        
        return ResponseEntity.ok(response);
    }

    /**
     * [엔드포인트 4] 나의 최근 분석 이력 조회 (마이페이지용)
     */
    @GetMapping("/my-history")
    public ResponseEntity<java.util.List<TaskStatusResponse>> getAnalysisHistory() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = (String) authentication.getPrincipal();

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));

        java.util.List<TaskStatusResponse> history = analysisService.getAnalysisHistory(user.getId());
        
        return ResponseEntity.ok(history);
    }
}
