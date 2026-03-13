package com.rebook.gateway.filter;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    private Key signingKey;

    @PostConstruct
    public void init() {
        this.signingKey = Keys.hmacShaKeyFor(hashSecret(jwtSecret));
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public String extractUserId(String token) {
        Claims claims = parseClaims(token);
        Object userId = claims.get("userId");
        if (userId != null) {
            return String.valueOf(userId);
        }
        return claims.getSubject();
    }

    public String extractRoles(String token) {
        Claims claims = parseClaims(token);
        Object roles = claims.get("roles");
        if (roles == null) {
            roles = claims.get("role");
        }
        if (roles == null) {
            return "";
        }

        if (roles instanceof Collection<?> collection) {
            return collection.stream().map(String::valueOf).collect(Collectors.joining(","));
        }

        return String.valueOf(roles);
    }

    public String extractDisplayName(String token) {
        Claims claims = parseClaims(token);
        Object name = claims.get("name");
        if (name != null && !String.valueOf(name).isBlank()) {
            return String.valueOf(name);
        }

        Object email = claims.get("email");
        if (email != null && !String.valueOf(email).isBlank()) {
            String e = String.valueOf(email);
            int at = e.indexOf('@');
            return at > 0 ? e.substring(0, at) : e;
        }

        Object userId = claims.get("userId");
        if (userId != null) {
            return "User " + userId;
        }

        String subject = claims.getSubject();
        return (subject == null || subject.isBlank()) ? "User" : "User " + subject;
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private byte[] hashSecret(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(secret.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Unable to initialize JWT signing key", ex);
        }
    }
}
