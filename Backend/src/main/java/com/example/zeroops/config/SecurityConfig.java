package com.example.zeroops.config;

import com.example.zeroops.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.NoOpPasswordEncoder; 
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.Customizer;
// import org.springframework.security.web.authentication.HttpStatusEntryPoint; // Uncomment if you use this
// import org.springframework.http.HttpStatus; // Uncomment if you use this

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService; // Keep this, it's used by your authenticationProvider bean

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // Keep existing OPTIONS rule
                .requestMatchers("/api/auth/**").permitAll() // Existing rule for auth
                .requestMatchers("/public/**", "/error", "/swagger-ui/**", "/v3/api-docs/**").permitAll() // Example: Allow Swagger & public
                // START OF NEW MODIFICATION: Permit PUT requests to the status update endpoint
                .requestMatchers(HttpMethod.PUT, "/api/deployments/**/status").permitAll()
                // END OF NEW MODIFICATION
                .requestMatchers(HttpMethod.GET, "/api/deployments", "/api/deployments/**").authenticated() // Keep GET authenticated
                .requestMatchers(HttpMethod.POST, "/api/deployments", "/api/deployments/**/redeploy").authenticated() // Keep POST authenticated for specific redeploy
                .requestMatchers(HttpMethod.POST, "/api/deployments").authenticated() // Ensure creating deployments is authenticated
                // Add other specific rules for your application as needed
                .anyRequest().authenticated() // All other requests require authentication
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider()) // Use your existing bean method
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
            // Optional: Custom handling for authentication errors if needed
            // .exceptionHandling(exceptions -> exceptions
            //     .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            // );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Use NoOpPasswordEncoder - VERY INSECURE, FOR DEVELOPMENT/TESTING ONLY
        return NoOpPasswordEncoder.getInstance();
        // return new BCryptPasswordEncoder(); // This was the secure way
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder()); // This will now use NoOpPasswordEncoder
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}