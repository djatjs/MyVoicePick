package com.MyVoicePick.demo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentRequest {
    private String plan; // "PRO" or "STUDIO"
}
