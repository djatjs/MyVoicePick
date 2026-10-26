package com.MyVoicePick.demo.controller;

import com.MyVoicePick.demo.dto.TossBillingConfirmRequest;
import com.MyVoicePick.demo.dto.TossConfirmRequest;
import com.MyVoicePick.demo.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 결제 승인(payment confirmation)과 정기결제 키(billing key)를 다루는 REST Controller 입니다.
 *
 * POST /api/v1/payments/confirmations   토스 결제 승인 (204)
 * POST /api/v1/billing-keys             빌링키 발급 + 1회차 결제 (204)
 *
 * /api/v1/payment/toss/** 는 예전 주소입니다. 배포된 프론트가 새 주소로 바뀔 때까지만 같이 받습니다.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping({"/payments/confirmations", "/payment/toss/confirm"})
    public ResponseEntity<Void> confirmPayment(@RequestBody TossConfirmRequest request,
                                               @AuthenticationPrincipal String userEmail) {
        paymentService.confirmTossPayment(request.getPaymentKey(), request.getOrderId(), request.getAmount(), request.getPlan(), userEmail);
        return ResponseEntity.noContent().build();
    }

    @PostMapping({"/billing-keys", "/payment/toss/billing/confirm"})
    public ResponseEntity<Void> issueBillingKey(@RequestBody TossBillingConfirmRequest request,
                                                @AuthenticationPrincipal String userEmail) {
        paymentService.confirmBillingAuth(request.getAuthKey(), request.getCustomerKey(), request.getPlan(), userEmail);
        return ResponseEntity.noContent().build();
    }
}
