package com.MyVoicePick.demo.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사용자 정보를 관리하는 Entity 클래스입니다.
 * 
 * [설계 의도]
 * 1. User는 DB 예약어와 충돌할 수 있으므로 테이블명을 "users"로 명시했습니다.
 * 2. 의미 없는 기본 생성자 사용을 막기 위해 AccessLevel.PROTECTED를 사용했습니다. (JPA 프록시 생성을 위한 최소 권한)
 * 3. @Setter를 사용하지 않고 상태 변경은 도메인 로직(메서드) 안에서만 처리되게 하여 데이터 무결성을 유지합니다.
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 이메일은 중복 가입을 방지하는 식별자로 사용되므로 unique 제약조건을 추가했습니다.
    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String nickname;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public User(String email, String nickname) {
        this.email = email;
        this.nickname = nickname;
    }

    // 엔티티가 처음 DB에 저장되기 전에 자동으로 호출되어 생성 시간을 채워줍니다.
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
