package com.MyVoicePick.demo.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 음성 파일 업로드부터 분석 완료까지의 전체 파이프라인 상태를 추적하는 Entity 클래스입니다.
 *
 * [설계 의도]
 * 1. 클라이언트가 API를 찔렀을 때 즉시 완료되지 않기 때문에(비동기 처리), Task 레코드를 만들고 영수증(UUID)을 발급합니다.
 * 2. `task_uuid`는 외부 노출용 식별자로 사용하여 보안성을 높입니다. (시퀀스 숫자가 노출되면 총 요청 건수 유추 가능)
 * 3. User, Song 모델과 모두 다대일 연관관계(@ManyToOne)를 가지며, N+1 문제 방지와 성능 최적화를 위해 FetchType.LAZY(지연 로딩)를 적용합니다.
 * 4. 분석 상태(status)는 문자열이 아닌 Enum 값으로 지정하여 휴먼 에러를 방지합니다.
 */
@Entity
@Table(name = "analysis_tasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnalysisTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 클라이언트에게 반환할 폴링용 식별자
    @Column(name = "task_uuid", unique = true, nullable = false, updatable = false)
    private String taskUuid;

    // 어떤 유저의 작업인지 추적 (지연 로딩을 통해 필요 시 쿼리)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // S3에 올라간 파일의 이름(Key). 이제 전체 URL 대신 Key만 저장하여 공간을 절약하고 보안을 강화합니다.
    @Column(name = "s3_file_url", nullable = false)
    private String s3FileUrl;

    // 현재 작업 상태 (Enum 타입 강제)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisStatus status;

    // 분석 완료 후 클라이언트에게 응답하기 위해 매칭된 노래의 외래키를 저장. 
    // 완료 전에는 NULL이므로 nullable = true
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_song_id")
    private Song matchedSong;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * AI 파이썬 워커가 분석 후 생성한 목소리 성향 태그를 JSON 배열 문자열로 저장합니다.
     * 예: ["#부드러운_중저음", "#감성_발라드_추천"]
     * DB 컬럼 타입은 TEXT로, 직렬화/역직렬화는 Service 레이어에서 처리합니다.
     */
    @Column(name = "voice_tags", columnDefinition = "TEXT")
    private String voiceTagsJson;

    @Column(name = "similarity_score")
    private Integer similarityScore;

    @Column(name = "pitch_hz")
    private Integer pitchHz;

    @Column(name = "recommend_reason", columnDefinition = "TEXT")
    private String recommendReason;

    // [추가] 보컬 페르소나 (예: "새벽 라디오를 닮은 따뜻한 바리톤")
    @Column(name = "vocal_persona", columnDefinition = "TEXT")
    private String vocalPersona;

    // [추가] 보컬 스탯 (JSON 문자열: warmth, clarity, power, rhythm, emotion)
    @Column(name = "vocal_stats", columnDefinition = "TEXT")
    private String vocalStatsJson;

    @Builder
    public AnalysisTask(String taskUuid, User user, String s3FileUrl, AnalysisStatus status) {
        this.taskUuid = taskUuid;
        this.user = user;
        this.s3FileUrl = s3FileUrl;
        this.status = status != null ? status : AnalysisStatus.PENDING;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    /**
     * @param user 요청을 보낸 사용자 엔티티
     * @param s3FileUrl 업로드된 음성 파일의 S3 경로
     * @return PENDING 상태의 신규 AnalysisTask 객체
     *
     * [설계 의도]
     * 객체 생성 로직(UUID 발급, 초기 상태 부여 등)을 Service에서 분리하여 Entity 내부로 캡슐화합니다.
     * 이를 통해 비즈니스 계층의 코드가 간결해지고, 데이터 일관성이 보장됩니다.
     */
    public static AnalysisTask create(User user, String s3FileUrl) {
        return AnalysisTask.builder()
                .taskUuid(java.util.UUID.randomUUID().toString())
                .user(user)
                .s3FileUrl(s3FileUrl)
                .status(AnalysisStatus.PENDING)
                .build();
    }

    /**
     * 상태를 업데이트하는 비즈니스 메서드 (Setter 대신 도메인 의도를 명확히 함)
     * 예: 분석 시작 시 PROCESSING으로 변경, 완료 시(노래 매칭) COMPLETED 및 matchedSong 저장
     */
    public void updateStatus(AnalysisStatus newStatus) {
        this.status = newStatus;
    }

    public void completeTask(Song matchedSong, String voiceTagsJson, Integer similarityScore, Integer pitchHz, String recommendReason, String vocalPersona, String vocalStatsJson) {
        this.status = AnalysisStatus.COMPLETED;
        this.matchedSong = matchedSong;
        this.voiceTagsJson = voiceTagsJson;
        this.similarityScore = similarityScore;
        this.pitchHz = pitchHz;
        this.recommendReason = recommendReason;
        this.vocalPersona = vocalPersona;
        this.vocalStatsJson = vocalStatsJson;
    }

    public void failTask() {
        this.status = AnalysisStatus.FAILED;
    }
}
