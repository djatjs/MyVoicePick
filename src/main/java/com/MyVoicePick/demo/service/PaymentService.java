package com.MyVoicePick.demo.service;

import com.MyVoicePick.demo.entity.User;
import com.MyVoicePick.demo.entity.UserPlan;
import com.MyVoicePick.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final UserRepository userRepository;

    @Value("${toss.payment.secret-key}")
    private String tossSecretKey;

    /**
     * 결제 체크아웃 세션을 생성합니다.
     * 실제 운영 환경에서는 Stripe Java SDK 등을 사용하여 실제 결제창 URL을 생성해야 합니다.
     * 현재는 데모를 위해 백엔드의 Mock 성공 엔드포인트로 리다이렉트하는 URL을 반환합니다.
     */
    public String createCheckoutSession(String userEmail, String plan) {
        log.info("Creating checkout session for user: {} with plan: {}", userEmail, plan);
        
        // 사용자가 유효한지 확인
        userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));

        // 프론트엔드의 토스페이먼츠 결제창 페이지로 리다이렉트
        return "http://localhost:3000/checkout?plan=" + plan;
    }

    /**
     * 결제가 완료되었을 때 유저의 플랜을 업데이트합니다.
     */
    @Transactional
    public void processPaymentSuccess(String userEmail, String planStr) {
        log.info("Processing payment success for user: {}, plan: {}", userEmail, planStr);
        
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));

        try {
            UserPlan newPlan = UserPlan.valueOf(planStr.toUpperCase());
            user.upgradePlan(newPlan, null);
            log.info("User {} upgraded to plan {}", userEmail, newPlan);
        } catch (IllegalArgumentException e) {
            log.error("Invalid plan requested: {}", planStr);
            throw new RuntimeException("Invalid plan: " + planStr);
        }
    }

    /**
     * 토스페이먼츠 실제 결제 승인 API를 호출하고 유저 플랜을 업그레이드합니다.
     */
    @Transactional
    public void confirmTossPayment(String paymentKey, String orderId, Long amount, String plan, String userEmail) {
        log.info("Confirming Toss Payment: key={}, order={}, amount={}", paymentKey, orderId, amount);

        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        
        // 토스페이먼츠 API 시크릿 키는 application.yml을 통해 주입받아 사용합니다.
        // Secret Key 뒤에 콜론(:)을 붙여 Base64 인코딩한 값을 Basic Auth 헤더로 사용합니다.
        headers.setBasicAuth(tossSecretKey, "");
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

        java.util.Map<String, Object> body = new java.util.HashMap<>();
        body.put("paymentKey", paymentKey);
        body.put("orderId", orderId);
        body.put("amount", amount);

        org.springframework.http.HttpEntity<java.util.Map<String, Object>> entity = new org.springframework.http.HttpEntity<>(body, headers);

        try {
            // 토스페이먼츠 승인 서버로 결제 확정 요청
            org.springframework.http.ResponseEntity<String> response = restTemplate.postForEntity(
                    "https://api.tosspayments.com/v1/payments/confirm", entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                // 결제 검증이 성공적으로 끝나면 DB 유저 플랜 업데이트
                User user = userRepository.findByEmail(userEmail)
                        .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));
                UserPlan newPlan = UserPlan.valueOf(plan.toUpperCase());
                user.upgradePlan(newPlan, null); // 빌링키 구현 전이므로 임시로 null 전달
                log.info("Toss Payment Confirmed. User {} upgraded to plan {}", userEmail, newPlan);
            } else {
                throw new RuntimeException("결제 승인 실패 (Toss API 오류)");
            }
        } catch (Exception e) {
            log.error("Toss Payment Confirmation Failed", e);
            throw new RuntimeException("Toss Payment Confirmation Failed", e);
        }
    }

    /**
     * 토스페이먼츠 빌링키(자동결제키) 발급 및 1회차 결제 진행
     */
    @Transactional
    public void confirmBillingAuth(String authKey, String customerKey, String plan, String userEmail) {
        log.info("Issuing Billing Key: authKey={}, customerKey={}", authKey, customerKey);

        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setBasicAuth(tossSecretKey, "");
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

        // 1. 빌링키 발급 요청
        java.util.Map<String, Object> issueBody = new java.util.HashMap<>();
        issueBody.put("authKey", authKey);
        issueBody.put("customerKey", customerKey);

        org.springframework.http.HttpEntity<java.util.Map<String, Object>> issueEntity = new org.springframework.http.HttpEntity<>(issueBody, headers);

        try {
            org.springframework.http.ResponseEntity<java.util.Map> issueResponse = restTemplate.postForEntity(
                    "https://api.tosspayments.com/v1/billing/authorizations/issue", issueEntity, java.util.Map.class);

            if (issueResponse.getStatusCode().is2xxSuccessful() && issueResponse.getBody() != null) {
                String billingKey = (String) issueResponse.getBody().get("billingKey");
                log.info("Successfully issued billingKey for user: {}", userEmail);

                // 2. 발급된 빌링키로 첫 번째 결제 (1회차) 요청
                Long amount = 100L; // 테스트용 100원. 실제론 plan에 따라 19000L 등 지정
                String orderId = "ORDER_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
                
                java.util.Map<String, Object> payBody = new java.util.HashMap<>();
                payBody.put("customerKey", customerKey);
                payBody.put("amount", amount);
                payBody.put("orderId", orderId);
                payBody.put("orderName", "MyVoicePick " + plan + " 구독 결제 (1회차)");

                org.springframework.http.HttpEntity<java.util.Map<String, Object>> payEntity = new org.springframework.http.HttpEntity<>(payBody, headers);
                
                org.springframework.http.ResponseEntity<String> payResponse = restTemplate.postForEntity(
                        "https://api.tosspayments.com/v1/billing/" + billingKey, payEntity, String.class);
                
                if (payResponse.getStatusCode().is2xxSuccessful()) {
                    // 결제 성공 시 유저 플랜 업데이트
                    User user = userRepository.findByEmail(userEmail)
                            .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));
                    UserPlan newPlan = UserPlan.valueOf(plan.toUpperCase());
                    
                    // 빌링키와 함께 플랜 업그레이드
                    user.upgradePlan(newPlan, billingKey);
                    log.info("First auto-payment confirmed. User {} upgraded to plan {}", userEmail, newPlan);
                } else {
                    throw new RuntimeException("1회차 정기결제 승인 실패");
                }
            } else {
                throw new RuntimeException("빌링키 발급 실패");
            }
        } catch (Exception e) {
            log.error("Billing Auth Failed", e);
            throw new RuntimeException("Billing Auth Failed", e);
        }
    }
}
