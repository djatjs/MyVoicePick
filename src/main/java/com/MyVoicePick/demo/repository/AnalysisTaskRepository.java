package com.MyVoicePick.demo.repository;

import com.MyVoicePick.demo.entity.AnalysisTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * 음성 분석 작업(AnalysisTask) 엔티티에 대한 데이터베이스 접근을 담당하는 Repository 입니다.
 */
public interface AnalysisTaskRepository extends JpaRepository<AnalysisTask, Long> {

    /**
     * 클라이언트가 Polling 방식으로 작업 상태를 조회할 때 사용하는 메서드입니다.
     * 내부 PK인 id가 아닌 보안상 안전한 taskUuid를 기반으로 조회합니다.
     *
     * [설계 의도]
     * 추후 상태 조회 API에서 엔티티를 반환할 때 매칭된 노래(matchedSong) 정보가 필요할 수 있습니다.
     * 엔티티에 설정된 연관관계가 FetchType.LAZY이므로, N+1 문제를 방지하기 위해 
     * fetch join을 사용하여 한 번의 쿼리로 Task와 Song을 함께 가져오도록 @Query를 작성할 수도 있습니다.
     * (현재는 기본 메서드로 생성 후, 성능 최적화가 필요할 때 @EntityGraph나 fetch join을 추가하는 것을 권장합니다.)
     */
    Optional<AnalysisTask> findByTaskUuid(String taskUuid);

    /**
     * 유저의 가장 최근 분석 결과를 가져옵니다. (마이페이지용)
     */
    Optional<AnalysisTask> findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * 유저의 최근 분석 이력 5개를 가져옵니다.
     */
    java.util.List<AnalysisTask> findTop5ByUserIdOrderByCreatedAtDesc(Long userId);
}
