package com.MyVoicePick.demo.dto;

import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 클라이언트의 Polling 요청(상태 조회)에 대한 응답 데이터를 담는 DTO 레코드입니다.
 * vocal_persona, vocal_stats 필드가 추가되어 종합 보컬 프로파일링 대시보드를 지원합니다.
 */
public record TaskStatusResponse(
        String taskId,
        AnalysisStatus status,
        String matchedSongTitle,
        String matchedArtist,
        String albumCoverUrl,
        String previewUrl,
        List<String> voiceTags,
        Integer similarityScore,
        Integer pitchHz,
        String recommendReason,
        String vocalPersona,           // [추가] 감성 보컬 타이틀
        Map<String, Object> vocalStats, // [추가] 5가지 특성 수치 + 128포인트 DNA 배열 등
        String userPlan,               // [신규] 사용자 요금제 (FREE, PRO, STUDIO)
        Map<String, Object> proFeatures // [신규] PRO 유저 전용 솔루션 데이터
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static TaskStatusResponse from(AnalysisTask task) {
        String songTitle = null;
        String songArtist = null;
        String albumCover = null;
        String preview = null;

        if (task.getMatchedSong() != null) {
            songTitle = task.getMatchedSong().getTitle();
            songArtist = task.getMatchedSong().getArtist();
            albumCover = task.getMatchedSong().getAlbumCoverUrl();
            preview = task.getMatchedSong().getPreviewUrl();
        }

        List<String> voiceTags = parseList(task.getVoiceTagsJson());
        Map<String, Object> vocalStats = parseMap(task.getVocalStatsJson());
        vocalStats.remove("dna_128_points");
        
        Map<String, Object> proFeatures = parseMap(task.getProFeaturesJson()); // [신규] PRO 기능 데이터 파싱

        return new TaskStatusResponse(
                task.getTaskUuid(),
                task.getStatus(),
                songTitle,
                songArtist,
                albumCover,
                preview,
                voiceTags,
                task.getSimilarityScore(),
                task.getPitchHz(),
                task.getRecommendReason(),
                task.getVocalPersona(),
                vocalStats,
                task.getUser().getPlan().name(), // 실제 사용자의 플랜 정보 반영
                proFeatures // 실제 DB 연동 데이터 반환
        );
    }

    /** DB의 JSON 배열 문자열 → List<String> 역직렬화. 실패 시 빈 리스트 반환. */
    @SuppressWarnings("unchecked")
    private static List<String> parseList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return MAPPER.readValue(json, List.class);
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    /** DB의 JSON 객체 문자열 → Map<String, Object> 역직렬화. 실패 시 빈 맵 반환. */
    private static Map<String, Object> parseMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return MAPPER.readValue(json, new TypeReference<Map<String, Object>>() {});

        } catch (JsonProcessingException e) {
            return Collections.emptyMap();
        }
    }
}
