package com.MyVoicePick.demo.repository;

import com.MyVoicePick.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import com.MyVoicePick.demo.entity.UserPlan;

/**
 * User 엔티티에 대한 데이터베이스 접근을 담당하는 Repository 입니다.
 * JpaRepository를 상속받아 기본적인 CRUD 및 페이징 처리를 자동으로 지원받습니다.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    // 이메일을 통해 기존 가입 사용자인지 확인합니다.
    Optional<User> findByEmail(String email);

    // 만료일이 지난 유료 플랜 사용자 조회
    List<User> findByPlanNotAndPlanExpiresAtBefore(UserPlan plan, LocalDateTime now);
}
