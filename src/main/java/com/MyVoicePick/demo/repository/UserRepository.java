package com.MyVoicePick.demo.repository;

import com.MyVoicePick.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * User 엔티티에 대한 데이터베이스 접근을 담당하는 Repository 입니다.
 * JpaRepository를 상속받아 기본적인 CRUD 및 페이징 처리를 자동으로 지원받습니다.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    // 필요한 경우 이메일을 통한 사용자 조회 메서드 등을 추가할 수 있습니다.
    // Optional<User> findByEmail(String email);
}
