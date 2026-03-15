package com.rebook.chat.config;

import com.rebook.chat.security.JwtUtil;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.messaging.simp.config.ChannelRegistration;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class WebSocketSecurityConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;

    public WebSocketSecurityConfig(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new JwtChannelInterceptor());
    }

    private class JwtChannelInterceptor implements ChannelInterceptor {

        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String token = extractToken(accessor);
                if (token == null || !jwtUtil.validateToken(token)) {
                    throw new AccessDeniedException("Invalid or missing JWT token for WebSocket CONNECT");
                }

                Long userId = jwtUtil.extractUserId(token);
                if (userId == null) {
                    throw new AccessDeniedException("JWT token does not contain a valid user id");
                }
                String role = jwtUtil.extractRole(token);
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                if (role != null && !role.isBlank()) {
                    String normalizedRole = role.startsWith("ROLE_") ? role : "ROLE_" + role;
                    authorities.add(new SimpleGrantedAuthority(normalizedRole));
                }

                if (accessor.getSessionAttributes() != null) {
                    accessor.getSessionAttributes().put("userId", userId);
                }

                Authentication authentication = new UsernamePasswordAuthenticationToken(userId, null, authorities);
                accessor.setUser(authentication);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

            return message;
        }

        private String extractToken(StompHeaderAccessor accessor) {
            String authorizationHeader = accessor.getFirstNativeHeader("Authorization");
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                return authorizationHeader.substring(7);
            }

            String passcodeHeader = accessor.getFirstNativeHeader("passcode");
            if (passcodeHeader != null && !passcodeHeader.isBlank()) {
                return passcodeHeader;
            }

            return null;
        }
    }
}
