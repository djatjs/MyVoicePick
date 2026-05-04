package com.MyVoicePick.demo.controller;

import com.MyVoicePick.demo.dto.TaskStatusResponse;
import com.MyVoicePick.demo.service.AnalysisService;
import com.MyVoicePick.demo.service.S3Uploader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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

    /**
     * [엔드포인트 1] 음성 파일 분석 요청 (비동기)
     * 클라이언트가 음성 파일을 업로드하면 즉시 분석 결과가 나오지 않으므로, HTTP 202 Accepted와 함께 추적용 영수증을 반환합니다.
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> requestAnalysis(
            // Spring Boot 3.2+ 버전부터는 파라미터 이름 추론이 기본적으로 비활성화되어 에러(IllegalArgumentException)가 
            // 자주 발생하므로, @RequestParam과 @PathVariable 내부에 "이름"을 명시적으로 적어주는 방어 코드를 적용했습니다.
            @RequestParam("userId") Long userId,
            @RequestParam("file") MultipartFile file
    ) {
        // S3에 실제 파일 업로드 후 반환된 파일명(Key) 확보
        String s3Key = s3Uploader.uploadFile(file);

        // 서비스 호출을 통해 분석 태스크(PENDING)를 DB에 적재 & 큐잉 대기 후 영수증(UUID) 확보
        String taskUuid = analysisService.requestAnalysis(userId, s3Key);

        // JSON 형태로 돌려주기 위해 Map 사용 (추후 CreateAnalysisResponse 같은 DTO 객체를 만들어 써도 좋습니다.)
        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("taskId", taskUuid);

        // HTTP 202 Accepted: "요청이 정상 접수되었고, 프로세스는 비동기적으로 처리 중입니다" 라는 명확한 의사 전달
        return ResponseEntity.accepted().body(responseBody);
    }

    /**
     * [엔드포인트 2] 작업 상태 조회 (Polling)
     * 클라이언트가 발급받은 영수증(UUID)으로 상태를 지속적으로 물어봅니다.
     */
    @GetMapping("/{taskId}/status")
    public ResponseEntity<TaskStatusResponse> getTaskStatus(
            @PathVariable("taskId") String taskId
    ) {
        // 비즈니스 로직(DB 검증, 상태 체크, 매핑)은 모두 Service와 DTO에서 우아하게 처리했으므로
        // 컨트롤러는 아주 가볍게 의존성만 넘겨줍니다. (Controller는 우편배달부 역할에만 충실해야 함)
        TaskStatusResponse response = analysisService.getTaskStatus(taskId);

        // HTTP 200 OK
        return ResponseEntity.ok(response);
    }
}
