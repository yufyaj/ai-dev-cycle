package com.aidev.interface.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
@Order(1)
class SecurityHeadersFilter : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Content Security Policy
        response.setHeader("Content-Security-Policy", 
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self'; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'"
        )
        
        // HTTP Strict Transport Security
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        
        // X-Content-Type-Options
        response.setHeader("X-Content-Type-Options", "nosniff")
        
        // X-Frame-Options
        response.setHeader("X-Frame-Options", "DENY")
        
        // X-XSS-Protection
        response.setHeader("X-XSS-Protection", "1; mode=block")
        
        // Referrer Policy
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
        
        // Permissions Policy
        response.setHeader("Permissions-Policy", 
            "camera=(), " +
            "microphone=(), " +
            "geolocation=(), " +
            "payment=(), " +
            "usb=()"
        )
        
        // Cache Control for sensitive pages
        if (request.requestURI.startsWith("/api/auth") || 
            request.requestURI.startsWith("/api/admin")) {
            response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            response.setHeader("Pragma", "no-cache")
            response.setHeader("Expires", "0")
        }
        
        filterChain.doFilter(request, response)
    }
}