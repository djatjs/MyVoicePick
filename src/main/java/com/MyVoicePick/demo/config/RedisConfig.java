package com.MyVoicePick.demo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Redis 연동 환경 및 공통 빈을 설정하는 Configuration 클래스입니다.
 */
@Configuration
public class RedisConfig {

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory redisConnectionFactory) {
        return new StringRedisTemplate(redisConnectionFactory);
    }

    /**
     * 특정 환경에서 Spring Boot 자동 설정이 누락되어 ObjectMapper 빈이 주입되지 않는 이슈를 해결하기 위해
     * 수동으로 빈을 등록합니다. (Java 8 날짜/시간 포맷 호환성을 위해 JavaTimeModule 추가)
     */
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}
