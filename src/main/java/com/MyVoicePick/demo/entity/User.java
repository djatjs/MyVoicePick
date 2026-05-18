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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserPlan plan;

    // --- 구독 및 결제 관리 필드 ---
    @Column(name = "plan_expires_at")
    private LocalDateTime planExpiresAt; // 현재 구독 주기의 만료일

    @Column(name = "subscription_status")
    private String subscriptionStatus; // ACTIVE(구독중), CANCELED(해지예약), NONE(구독안함)

    @Column(name = "billing_key")
    private String billingKey; // 토스페이먼츠 자동결제용 빌링키

    @Column(name = "customer_key", unique = true)
    private String customerKey; // 토스페이먼츠 회원 식별용 고유 키

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public User(String email, String nickname, UserPlan plan) {
        this.email = email;
        this.nickname = nickname;
        this.plan = plan != null ? plan : UserPlan.FREE;
        this.subscriptionStatus = "NONE";
        // 토스페이먼츠용 customerKey는 랜덤/고유값으로 최초 가입 시 생성
        this.customerKey = "USER_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    // 엔티티가 처음 DB에 저장되기 전에 자동으로 호출되어 생성 시간을 채워줍니다.
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    /**
     * 사용자의 요금제 플랜을 1개월 업그레이드/연장합니다.
     */
    public void upgradePlan(UserPlan newPlan, String newBillingKey) {
        this.plan = newPlan;
        this.subscriptionStatus = "ACTIVE";
        
        // 기존 만료일이 남아있으면 그 날짜부터 1개월 연장, 아니면 오늘부터 1개월
        if (this.planExpiresAt != null && this.planExpiresAt.isAfter(LocalDateTime.now())) {
            this.planExpiresAt = this.planExpiresAt.plusMonths(1);
        } else {
            this.planExpiresAt = LocalDateTime.now().plusMonths(1);
        }

        if (newBillingKey != null) {
            this.billingKey = newBillingKey;
        }
    }

    /**
     * 구독을 해지 예약합니다. (권한은 만료일까지 유지)
     */
    public void cancelSubscription() {
        if ("ACTIVE".equals(this.subscriptionStatus)) {
            this.subscriptionStatus = "CANCELED";
            // billingKey 삭제 로직 (선택적)
            this.billingKey = null; 
        }
    }

    /**
     * 만료일이 지났는지 확인하고, 지났으면 FREE로 강등시킵니다.
     */
    public void checkAndExpirePlan() {
        if (this.plan != UserPlan.FREE && this.planExpiresAt != null && LocalDateTime.now().isAfter(this.planExpiresAt)) {
            this.plan = UserPlan.FREE;
            this.subscriptionStatus = "NONE";
            this.billingKey = null;
        }
    }
}
