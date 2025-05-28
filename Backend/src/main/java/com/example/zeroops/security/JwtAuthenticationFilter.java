// filepath: c:\Users\ASUS\Documents\S8\Java-avance\ZeroOps\Backend\src\main\java\com\example\zeroops\security\JwtAuthenticationFilter.java
package com.example.zeroops.security;

import com.example.zeroops.security.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger; // Import Logger
import org.slf4j.LoggerFactory; // Import LoggerFactory
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class); // <<< ADD LOGGER
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        log.info("[JwtAuthFilter] Processing request for: {}", request.getRequestURI()); // <<< LOG REQUEST URI

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("[JwtAuthFilter] No JWT token found in Authorization header or header does not start with Bearer. URI: {}", request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        log.info("[JwtAuthFilter] Extracted JWT: {}", jwt); // Be careful logging full JWT in production

        try {
            userEmail = jwtService.extractUsername(jwt);
            log.info("[JwtAuthFilter] Extracted userEmail from JWT: {}", userEmail);
        } catch (Exception e) {
            log.error("[JwtAuthFilter] Error extracting username from JWT: {}. JWT: {}", e.getMessage(), jwt, e);
            filterChain.doFilter(request, response); // Potentially send an error response or just deny
            return;
        }


        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            log.info("[JwtAuthFilter] UserEmail is {} and SecurityContext has no authentication. Attempting to set authentication.", userEmail);
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
            log.info("[JwtAuthFilter] Loaded UserDetails for {}: {}", userEmail, userDetails.getUsername());


            if (jwtService.isTokenValid(jwt, userDetails)) {
                log.info("[JwtAuthFilter] JWT is valid for user {}.", userEmail);
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null, // Credentials
                        userDetails.getAuthorities()
                );
                authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.info("[JwtAuthFilter] Authentication set in SecurityContext for user {}. Authorities: {}", userEmail, userDetails.getAuthorities());
            } else {
                log.warn("[JwtAuthFilter] JWT is NOT valid for user {}.", userEmail);
            }
        } else {
            log.info("[JwtAuthFilter] UserEmail is null or SecurityContext already has authentication. UserEmail: {}, Auth: {}", userEmail, SecurityContextHolder.getContext().getAuthentication());
        }
        filterChain.doFilter(request, response);
    }
}