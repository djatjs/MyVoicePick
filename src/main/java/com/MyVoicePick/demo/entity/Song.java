package com.MyVoicePick.demo.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 미리 분석되어 있는 음원 데이터를 관리하는 Entity 클래스입니다.
 *
 * [설계 의도]
 * 1. AI 서버에서 분석한 음성 데이터(MFCC, ZCR, RMS)를 바탕으로 Cosine Similarity를 계산할 대상들입니다.
 * 2. MFCC 벡터는 17차원 배열 형태를 가집니다. 이를 DB에 저장하기 위해 문자열(JSON 문자열 등) 타입(TEXT)으로
 * 관리합니다.
 * MySQL 최신 버전을 쓴다면 추후 @Column(columnDefinition = "JSON") 등으로 고도화할 수 있지만,
 * 현재는 가장 호환성이 높은 TEXT 타입으로 매핑을 우선 설정합니다.
 */
@Entity
@Table(name = "songs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Song {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String artist;

    // 17차원의 MFCC 값은 길이가 길 수 있으므로 TEXT로 설정
    @Column(name = "mfcc_vector", columnDefinition = "TEXT", nullable = false)
    private String mfccVector;

    @Column(name = "zcr_value")
    private Float zcrValue;

    @Column(name = "rms_value")
    private Float rmsValue;

    @Column(name = "album_cover_url")
    private String albumCoverUrl;

    @Column(name = "preview_url")
    private String previewUrl;

    @Builder
    public Song(String title, String artist, String mfccVector, Float zcrValue, Float rmsValue, String albumCoverUrl,
            String previewUrl) {
        this.title = title;
        this.artist = artist;
        this.mfccVector = mfccVector;
        this.zcrValue = zcrValue;
        this.rmsValue = rmsValue;
        this.albumCoverUrl = albumCoverUrl;
        this.previewUrl = previewUrl;
    }
}
