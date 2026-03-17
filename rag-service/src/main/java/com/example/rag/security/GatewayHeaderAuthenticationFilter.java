package com.example.rag.security;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
public class GatewayHeaderAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String userId = request.getHeader("X-User-Id");
        if (userId == null || userId.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        String rolesHeader = request.getHeader("X-User-Roles");
        List<SimpleGrantedAuthority> authorities = parseAuthorities(rolesHeader);
        User principal = new User(userId.trim(), "N/A", authorities);

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                authorities);
        authentication.setDetails(request.getHeader("X-User-Name"));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        log.debug("Gateway header authentication applied for userId={}", userId);
        filterChain.doFilter(request, response);
    }

    private List<SimpleGrantedAuthority> parseAuthorities(String rolesHeader) {
        if (rolesHeader == null || rolesHeader.isBlank()) {
            return List.of(new SimpleGrantedAuthority("ROLE_USER"));
        }

        return Arrays.stream(rolesHeader.split(","))
                .map(String::trim)
                .filter(role -> !role.isBlank())
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }
}