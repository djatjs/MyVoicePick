package com.MyVoicePick.demo.scheduler;

import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.entity.UserPlan;
import com.MyVoicePick.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 플랜 만료 스케줄러
 * 수동 갱신형 단건 결제 유저들의 1개월 만료일을 체크하여
 * 만료일이 지난 유저를 FREE 플랜으로 자동 강등시킵니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PlanExpirationScheduler {

    private final UserRepository userRepository;

    // 매일 자정(00:00)에 실행되도록 설정
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void checkAndExpirePlans() {
        log.info("Starting plan expiration check scheduler...");
        
        // 현재 시간 기준으로 만료일이 지난 PRO/STUDIO 플랜 유저 조회
        List<User> expiredUsers = userRepository.findByPlanNotAndPlanExpiresAtBefore(
                UserPlan.FREE, 
                LocalDateTime.now()
        );

        if (expiredUsers.isEmpty()) {
            log.info("No users found with expired plans today.");
            return;
        }

        log.info("Found {} user(s) with expired plans. Downgrading to FREE...", expiredUsers.size());

        for (User user : expiredUsers) {
            log.info("Downgrading user {} (plan: {}, expired_at: {})", 
                    user.getEmail(), user.getPlan(), user.getPlanExpiresAt());
            
            // User 엔티티의 만료 체크 로직 호출
            user.checkAndExpirePlan();
        }

        // 트랜잭션 종료 시 JPA가 자동으로 변경(Dirty Checking) 감지 후 DB 업데이트 실행
        log.info("Finished plan expiration check scheduler.");
    }
}
