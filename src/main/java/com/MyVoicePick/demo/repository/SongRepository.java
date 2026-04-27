package com.MyVoicePick.demo.repository;

import com.MyVoicePick.demo.entity.Song;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Song 엔티티에 대한 데이터베이스 접근을 담당하는 Repository 입니다.
 */
public interface SongRepository extends JpaRepository<Song, Long> {
}
