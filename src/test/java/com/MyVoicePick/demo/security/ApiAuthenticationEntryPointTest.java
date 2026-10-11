package com.MyVoicePick.demo.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;

class ApiAuthenticationEntryPointTest {

    @Test
    void respondsWith401JsonInsteadOfRedirect() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        new ApiAuthenticationEntryPoint().commence(new MockHttpServletRequest("GET", "/api/v1/users/me"), response,
                new InsufficientAuthenticationException("no token"));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getRedirectedUrl()).isNull();
        assertThat(response.getContentAsString()).contains("UNAUTHORIZED");
    }
}
