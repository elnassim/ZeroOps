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
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/public/**", "/error", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                
                // Corrected patterns for specific deployment actions
                .requestMatchers(HttpMethod.PUT, "/api/deployments/{deploymentId}/status").permitAll() // Corrected: Use path variable
                .requestMatchers(HttpMethod.POST, "/api/deployments/{deploymentId}/redeploy").authenticated() // Corrected: Use path variable

                // Rule for creating a new deployment (e.g., POST to /api/deployments/deploy or /api/deploy)
                // Assuming your controller method for new deployment is at /api/deployments/deploy
                .requestMatchers(HttpMethod.POST, "/api/deployments/deploy").authenticated()
                // If your actual endpoint for new deployment is /api/deploy (and not under /api/deployments in the path)
                // then you would need a rule like: .requestMatchers(HttpMethod.POST, "/api/deploy").authenticated()
                // However, based on typical Spring structure and your DeploymentController being mapped to /api/deployments,
                // /api/deployments/deploy is more likely.

                // General rules for /api/deployments
                .requestMatchers(HttpMethod.GET, "/api/deployments", "/api/deployments/**").authenticated() // Matches GET /api/deployments and GET /api/deployments/anything
                .requestMatchers(HttpMethod.POST, "/api/deployments").authenticated() // Matches POST to /api/deployments (if you have such an endpoint)
                                
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

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