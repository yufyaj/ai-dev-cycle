package com.formsales.infrastructure.security

import io.jsonwebtoken.*
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.security.Key
import java.time.Duration
import java.time.Instant
import java.util.*

@Component
class JwtTokenProvider(
    @Value("\${app.jwt.secret:defaultSecretKeyForDevelopmentOnly}")
    private val secretKey: String,
    @Value("\${app.jwt.expiration:3600}")
    private val expirationSeconds: Long = 3600
) {
    
    private val key: Key by lazy {
        Keys.hmacShaKeyFor(secretKey.toByteArray())
    }
    
    fun generateToken(userId: String, role: String): String {
        val now = Instant.now()
        val expiration = now.plus(Duration.ofSeconds(expirationSeconds))
        
        return Jwts.builder()
            .setSubject(userId)
            .claim("role", role)
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(expiration))
            .signWith(key, SignatureAlgorithm.HS256)
            .compact()
    }
    
    fun validateToken(token: String): Boolean {
        return try {
            Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
            true
        } catch (e: JwtException) {
            false
        } catch (e: IllegalArgumentException) {
            false
        }
    }
    
    fun getUserIdFromToken(token: String): String {
        val claims = Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .body
            
        return claims.subject
    }
    
    fun getRoleFromToken(token: String): String {
        val claims = Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .body
            
        return claims["role"] as String
    }
}