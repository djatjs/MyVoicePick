package com.MyVoicePick.demo.dto;

import com.MyVoicePick.demo.entity.AnalysisStatus;
import com.MyVoicePick.demo.entity.AnalysisTask;

/**
 * 클라이언트의 Polling 요청(상태 조회)에 대한 응답 데이터를 담는 DTO 레코드입니다.
 * 
 * [설계 의도]
 * 1. Java 14+부터 도입된 Record를 사용하여 불변(Immutable) 객체로 선언했습니다.
 *    상태값 응답 용도는 데이터의 조작이 필요 없으므로 Getter나 생성자를 수동 작성할 필요 없는 Record가 가장 적합합니다.
 * 2. 보안을 위해 내부 식별자(PK) 대신 UUID인 taskId를 반환합니다.
 * 3. 엔티티(AnalysisTask)를 직접 넘기지 않고 정적 팩토리 메서드(from)를 두어, 
 *    프레젠테이션(Controller) 계층과 도메인(Entity) 계층 간의 의존성을 분리(Decoupling)했습니다.
 */
public record TaskStatusResponse(
        String taskId,
        AnalysisStatus status,
        String matchedSongTitle,
        String matchedArtist
) {
    /**
     * Entity를 DTO로 변환하는 정적 팩토리 메서드
     * 아직 매칭된 노래가 없는 상태(PENDING, PROCESSING, FAILED)일 경우 NPE 방지를 위해 null을 반환합니다.
     */
    public static TaskStatusResponse from(AnalysisTask task) {
        String songTitle = null;
        String songArtist = null;

        if (task.getMatchedSong() != null) {
            songTitle = task.getMatchedSong().getTitle();
            songArtist = task.getMatchedSong().getArtist();
        }

        return new TaskStatusResponse(
                task.getTaskUuid(),
                task.getStatus(),
                songTitle,
                songArtist
        );
    }
}
