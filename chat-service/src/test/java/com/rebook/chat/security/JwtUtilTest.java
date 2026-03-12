package com.rebook.chat.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtUtilTest {

    private static final String SECRET = "rebook-chat-secret-for-testing-123";

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", SECRET);
        jwtUtil.init();
    }

    @Test
    void validateAndExtractClaims_shouldSucceedForValidToken() throws Exception {
        String token = buildToken(42L, "USER", System.currentTimeMillis() + 60_000);

        assertTrue(jwtUtil.validateToken(token));
        assertEquals(42L, jwtUtil.extractUserId(token));
        assertEquals("USER", jwtUtil.extractRole(token));
    }

    @Test
    void validateToken_shouldFailForExpiredToken() throws Exception {
        String token = buildToken(42L, "USER", System.currentTimeMillis() - 60_000);

        assertFalse(jwtUtil.validateToken(token));
    }

    @Test
    void validateToken_shouldFailForMalformedToken() {
        assertFalse(jwtUtil.validateToken("not-a-jwt"));
    }

    private String buildToken(Long userId, String role, long expirationTimeMillis) throws Exception {
        byte[] hashedSecret = MessageDigest.getInstance("SHA-256")
                .digest(SECRET.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .setSubject(userId.toString())
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(expirationTimeMillis))
                .signWith(Keys.hmacShaKeyFor(hashedSecret), SignatureAlgorithm.HS256)
                .compact();
    }
}
