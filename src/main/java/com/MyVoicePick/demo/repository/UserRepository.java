package com.MyVoicePick.demo.repository;

import com.MyVoicePick.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * User 엔티티에 대한 데이터베이스 접근을 담당하는 Repository 입니다.
 * JpaRepository를 상속받아 기본적인 CRUD 및 페이징 처리를 자동으로 지원받습니다.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    // 이메일을 통해 기존 가입 사용자인지 확인합니다.
    Optional<User> findByEmail(String email);
}
