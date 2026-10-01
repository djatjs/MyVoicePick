package com.MyVoicePick.demo.controller;

import com.MyVoicePick.demo.dto.PaymentRequest;
import com.MyVoicePick.demo.dto.PaymentResponse;
import com.MyVoicePick.demo.dto.TossConfirmRequest;
import com.MyVoicePick.demo.dto.TossBillingConfirmRequest;
import com.MyVoicePick.demo.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * 결제 세션 생성 요청 핸들러
     */
    @PostMapping("/create")
    public ResponseEntity<PaymentResponse> createPayment(@RequestBody PaymentRequest request,
                                                       @AuthenticationPrincipal String userEmail) {
        // JwtAuthenticationFilter에서 email(String)을 principal로 설정했으므로 바로 사용합니다.
        String checkoutUrl = paymentService.createCheckoutSession(userEmail, request.getPlan());
        
        return ResponseEntity.ok(new PaymentResponse(checkoutUrl));
    }

    @PostMapping("/toss/confirm")
    public ResponseEntity<?> confirmToss(@RequestBody TossConfirmRequest request,
                                         @AuthenticationPrincipal String userEmail) {
        paymentService.confirmTossPayment(request.getPaymentKey(), request.getOrderId(), request.getAmount(), request.getPlan(), userEmail);
        return ResponseEntity.ok().build();
    }
    @PostMapping("/toss/billing/confirm")
    public ResponseEntity<?> confirmTossBilling(@RequestBody TossBillingConfirmRequest request,
                                         @AuthenticationPrincipal String userEmail) {
        paymentService.confirmBillingAuth(request.getAuthKey(), request.getCustomerKey(), request.getPlan(), userEmail);
        return ResponseEntity.ok().build();
    }
}
