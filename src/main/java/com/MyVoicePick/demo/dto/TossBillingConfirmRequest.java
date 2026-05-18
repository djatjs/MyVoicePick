package com.MyVoicePick.demo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TossBillingConfirmRequest {
    private String authKey;
    private String customerKey;
    private String plan; // "PRO" or "STUDIO"
}
