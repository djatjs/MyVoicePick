package com.MyVoicePick.demo.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class CustomOAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;

    public CustomOAuth2SuccessHandler(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        
        // 각 소셜 제공자(Google, Naver, Kakao)에 따라 반환되는 어트리뷰트 구조가 다름.
        // 현재는 가장 보편적인 식별자나 name 속성을 임시로 사용하지만, 실무에서는 
        // Provider를 판별하여 이메일 또는 고유 ID를 파싱하는 로직이 추가되어야 함.
        String email = parseEmailOrId(oAuth2User);
        
        // JWT 토큰 생성
        String token = jwtUtil.generateToken(email);
        
        // 프론트엔드의 특정 엔드포인트(예: 로그인 성공 처리 페이지)로 리다이렉트 하면서 JWT 전달
        String targetUrl = "http://localhost:3000/login/success?token=" + token;
        
        response.sendRedirect(targetUrl);
    }

    /**
     * 임시 파싱 로직. 각 제공자(Provider)에 맞게 attributes를 안전하게 추출해야 합니다.
     */
    private String parseEmailOrId(OAuth2User oAuth2User) {
        if (oAuth2User.getAttributes().containsKey("email")) {
            return (String) oAuth2User.getAttributes().get("email");
        } else if (oAuth2User.getAttributes().containsKey("response")) {
            // Naver의 경우 'response' 안에 유저 정보가 들어 있음
            java.util.Map<String, Object> response = (java.util.Map<String, Object>) oAuth2User.getAttributes().get("response");
            return (String) response.get("email");
        } else if (oAuth2User.getAttributes().containsKey("kakao_account")) {
            // Kakao의 경우 'kakao_account' 안에 이메일이 들어 있음
            java.util.Map<String, Object> kakaoAccount = (java.util.Map<String, Object>) oAuth2User.getAttributes().get("kakao_account");
            return (String) kakaoAccount.get("email");
        }
        
        // fallback
        return oAuth2User.getName();
    }
}
