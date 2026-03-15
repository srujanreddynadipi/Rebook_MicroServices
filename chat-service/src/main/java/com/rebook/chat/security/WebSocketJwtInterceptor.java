package com.rebook.chat.security;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * Intercepts WebSocket handshake to validate JWT token from Authorization header
 * and store user ID in session attributes for later access via Principal.
 */
@Component
public class WebSocketJwtInterceptor implements HandshakeInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketJwtInterceptor.class);

    private final JwtUtil jwtUtil;

    public WebSocketJwtInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean beforeHandshake(org.springframework.http.server.ServerHttpRequest request,
                                  org.springframework.http.server.ServerHttpResponse response,
                                  WebSocketHandler wsHandler,
                                  Map<String, Object> attributes) {
        try {
            // Extract Authorization header
            String authHeader = request.getHeaders().getFirst("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("WebSocket handshake: Missing or invalid Authorization header");
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            String token = authHeader.substring("Bearer ".length());

            // Validate JWT token
            if (!jwtUtil.validateToken(token)) {
                log.warn("WebSocket handshake: Invalid or expired JWT token");
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            // Extract user ID from token
            Long userId = jwtUtil.extractUserId(token);
            if (userId == null) {
                log.warn("WebSocket handshake: No user ID in JWT token");
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            // Store user ID in session attributes for access in @MessageMapping
            attributes.put("userId", userId);
            attributes.put("authToken", token);

            log.info("WebSocket handshake successful for user {}", userId);
            return true;

        } catch (Exception e) {
            log.error("WebSocket handshake error: {}", e.getMessage(), e);
            try {
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
            } catch (Exception ignored) {}
            return false;
        }
    }

    @Override
    public void afterHandshake(org.springframework.http.server.ServerHttpRequest request,
                              org.springframework.http.server.ServerHttpResponse response,
                              WebSocketHandler wsHandler,
                              Exception exception) {
        if (exception != null) {
            log.error("WebSocket handshake afterHandshake error: {}", exception.getMessage());
        }
    }
}
