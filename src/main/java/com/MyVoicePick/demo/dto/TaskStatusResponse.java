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
        Map<String, Integer> vocalStats  // [추가] 5가지 특성 수치 (warmth, clarity, power, rhythm, emotion)
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
        Map<String, Integer> vocalStats = parseMap(task.getVocalStatsJson());

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
                vocalStats
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

    /** DB의 JSON 객체 문자열 → Map<String, Integer> 역직렬화. 실패 시 빈 맵 반환. */
    private static Map<String, Integer> parseMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return MAPPER.readValue(json, new TypeReference<Map<String, Integer>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyMap();
        }
    }
}
