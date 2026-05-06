package com.MyVoicePick.demo.security;

import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.entity.UserPlan;
import com.MyVoicePick.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        // 각 플랫폼별로 데이터 추출 로직이 다름 (Google, Naver, Kakao)
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String email = extractEmail(registrationId, oAuth2User.getAttributes());
        String nickname = extractNickname(registrationId, oAuth2User.getAttributes());

        // DB에 저장 혹은 업데이트
        saveOrUpdate(email, nickname);

        return oAuth2User;
    }

    private String extractEmail(String registrationId, Map<String, Object> attributes) {
        if ("naver".equals(registrationId)) {
            Map<String, Object> response = (Map<String, Object>) attributes.get("response");
            return (String) response.get("email");
        } else if ("kakao".equals(registrationId)) {
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            return (String) kakaoAccount.get("email");
        } else {
            // google
            return (String) attributes.get("email");
        }
    }

    private String extractNickname(String registrationId, Map<String, Object> attributes) {
        if ("naver".equals(registrationId)) {
            Map<String, Object> response = (Map<String, Object>) attributes.get("response");
            return (String) response.get("nickname");
        } else if ("kakao".equals(registrationId)) {
            Map<String, Object> properties = (Map<String, Object>) attributes.get("properties");
            return (String) properties.get("nickname");
        } else {
            // google
            return (String) attributes.get("name");
        }
    }

    private void saveOrUpdate(String email, String nickname) {
        userRepository.findByEmail(email)
                .map(user -> {
                    // 닉네임 정도만 업데이트 (필요 시)
                    return user; 
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .email(email)
                            .nickname(nickname)
                            .plan(UserPlan.FREE)
                            .build();
                    return userRepository.save(newUser);
                });
    }
}
