package com.rebook.gateway.config;

import java.util.List;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import com.rebook.gateway.filter.JwtAuthenticationFilter;

@Configuration
public class GatewayConfig {

        private final JwtAuthenticationFilter jwtAuthFilter;

        public GatewayConfig(JwtAuthenticationFilter jwtAuthFilter) {
                this.jwtAuthFilter = jwtAuthFilter;
        }

        @Bean
        public RouteLocator routes(RouteLocatorBuilder builder) {
                return builder.routes()

                                // ══════════════════════════════════════════
                                // AUTH SERVICE (lb://auth-service)
                                // ══════════════════════════════════════════

                                // POST /api/auth/** — public, no JWT
                                .route("auth-public", r -> r
                                                .path("/api/auth/**")
                                                .and().method(HttpMethod.POST)
                                                // .filters(f -> f.circuitBreaker(c ->
                                                // c.setName("auth-cb").setFallbackUri("forward:/fallback/auth")))
                                                .uri("lb://auth-service"))

                                // GET/PUT /api/users/** — authenticated
                                .route("auth-users", r -> r
                                                .path("/api/users/**")
                                                .and().method(HttpMethod.GET, HttpMethod.PUT)
                                                .filters(f -> f
                                                                .filter(jwtAuthFilter.apply(
                                                                                new JwtAuthenticationFilter.Config()))
                                                // .circuitBreaker(c ->
                                                // c.setName("auth-users-cb").setFallbackUri("forward:/fallback/auth"))
                                                )
                                                .uri("lb://auth-service"))

                                // DELETE/PUT /api/admin/users/** — authenticated + ROLE_ADMIN
                                .route("auth-admin-users", r -> r
                                                .path("/api/admin/users/**")
                                                .and().method(HttpMethod.DELETE, HttpMethod.PUT)
                                                .filters(f -> f
                                                                .filter(jwtAuthFilter.apply(
                                                                                new JwtAuthenticationFilter.Config()))
                                                // .circuitBreaker(c ->
                                                // c.setName("auth-admin-cb").setFallbackUri("forward:/fallback/auth"))
                                                )
                                                .uri("lb://auth-service"))

                                // ══════════════════════════════════════════
                                // BOOK SERVICE (lb://book-service)
                                // ══════════════════════════════════════════

                                // GET /api/books/search — public (must be declared before the wildcard routes)
                                .route("book-search", r -> r
                                                .path("/api/books/search")
                                                .and().method(HttpMethod.GET)
                                                // .filters(f -> f.circuitBreaker(c ->
                                                // c.setName("book-search-cb").setFallbackUri("forward:/fallback/book")))
                                                .uri("lb://book-service"))

                                // GET /api/books — public listing
                                .route("book-list", r -> r
                                                .path("/api/books")
                                                .and().method(HttpMethod.GET)
                                                // .filters(f -> f.circuitBreaker(c ->
                                                // c.setName("book-list-cb").setFallbackUri("forward:/fallback/book")))
                                                .uri("lb://book-service"))

                                // GET /api/books/{id} — public single item
                                .route("book-by-id", r -> r
                                                .path("/api/books/{id}")
                                                .and().method(HttpMethod.GET)
                                                // .filters(f -> f.circuitBreaker(c ->
                                                // c.setName("book-id-cb").setFallbackUri("forward:/fallback/book")))
                                                .uri("lb://book-service"))

                                // POST/PUT/DELETE /api/books/** — authenticated mutations
                                .route("book-mutate", r -> r
                                                .path("/api/books/**")
                                                .and().method(HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE)
                                                .filters(f -> f
                                                                .filter(jwtAuthFilter.apply(
                                                                                new JwtAuthenticationFilter.Config()))
                                                // .circuitBreaker(c ->
                                                // c.setName("book-mutate-cb").setFallbackUri("forward:/fallback/book"))
                                                )
                                                .uri("lb://book-service"))

                                // GET /api/recommendations/** — public
                                .route("book-recommendations", r -> r
                                                .path("/api/recommendations/**")
                                                .and().method(HttpMethod.GET)
                                                // .filters(f -> f.circuitBreaker(c ->
                                                // c.setName("recommendations-cb").setFallbackUri("forward:/fallback/book")))
                                                .uri("lb://book-service"))

                                // ══════════════════════════════════════════
                                // REQUEST SERVICE (lb://request-service)
                                // ══════════════════════════════════════════

                                // ALL /api/requests/** — authenticated
                                .route("requests-all", r -> r
                                                .path("/api/requests/**")
                                                .filters(f -> f
                                                                .filter(jwtAuthFilter.apply(
                                                                                new JwtAuthenticationFilter.Config()))
                                                // .circuitBreaker(c ->
                                                // c.setName("requests-cb").setFallbackUri("forward:/fallback/request"))
                                                )
                                                .uri("lb://request-service"))

                                // ALL /api/reviews/** — authenticated
                                .route("reviews-all", r -> r
                                                .path("/api/reviews/**")
                                                .filters(f -> f
                                                                .filter(jwtAuthFilter.apply(
                                                                                new JwtAuthenticationFilter.Config()))
                                                // .circuitBreaker(c ->
                                                // c.setName("reviews-cb").setFallbackUri("forward:/fallback/request"))
                                                )
                                                .uri("lb://request-service"))

                                // ══════════════════════════════════════════
                                // CHAT SERVICE (lb://chat-service)
                                // ══════════════════════════════════════════

                                // ALL /api/messages/** — authenticated
                                .route("chat-api", r -> r
                                                .path("/api/messages/**")
                                                .filters(f -> f
                                                                .filter(jwtAuthFilter.apply(
                                                                                new JwtAuthenticationFilter.Config()))
                                                // .circuitBreaker(c ->
                                                // c.setName("chat-cb").setFallbackUri("forward:/fallback/chat"))
                                                )
                                                .uri("lb://chat-service"))

                                // /ws/** — WebSocket, no JWT (auth handled inside chat-service)
                                .route("chat-websocket", r -> r
                                                .path("/ws/**")
                                                // .filters(f -> f.circuitBreaker(c -> c.setName("ws-cb")))
                                                .uri("lb://chat-service"))

                                // ══════════════════════════════════════════
                                // NOTIFICATION SERVICE (lb://notification-service)
                                // ══════════════════════════════════════════

                                // GET /api/notifications/** — authenticated
                                .route("notifications-get", r -> r
                                                .path("/api/notifications/**")
                                                .and().method(HttpMethod.GET)
                                                .filters(f -> f
                                                                .filter(jwtAuthFilter.apply(
                                                                                new JwtAuthenticationFilter.Config()))
                                                // .circuitBreaker(c ->
                                                // c.setName("notification-cb").setFallbackUri("forward:/fallback/notification"))
                                                )
                                                .uri("lb://notification-service"))

                                .build();
        }

        /**
         * Global CORS configuration — permissive for local development.
         * Restrict origins/methods in production.
         */
        @Bean
        public CorsWebFilter corsWebFilter() {
                CorsConfiguration cors = new CorsConfiguration();
                cors.setAllowedOriginPatterns(List.of("*"));
                cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                cors.setAllowedHeaders(List.of("*"));
                cors.setExposedHeaders(List.of("Authorization", "X-User-Id", "X-User-Name", "X-User-Roles"));
                cors.setAllowCredentials(true);
                cors.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", cors);
                return new CorsWebFilter(source);
        }
}
