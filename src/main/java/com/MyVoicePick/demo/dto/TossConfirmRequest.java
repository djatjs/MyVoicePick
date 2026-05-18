package com.MyVoicePick.demo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TossConfirmRequest {
    private String paymentKey;
    private String orderId;
    private Long amount;
    private String plan;
}
