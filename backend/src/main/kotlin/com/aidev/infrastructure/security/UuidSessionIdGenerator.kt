package com.aidev.infrastructure.security

import com.aidev.domain.security.SessionId
import com.aidev.usecase.security.SessionIdGenerator
import org.springframework.stereotype.Service
import java.security.SecureRandom
import java.util.*

@Service
class UuidSessionIdGenerator : SessionIdGenerator {
    
    private val secureRandom = SecureRandom()
    
    override fun generate(): SessionId {
        val uuid = UUID.randomUUID().toString()
        val timestamp = System.currentTimeMillis()
        val randomBytes = ByteArray(16)
        secureRandom.nextBytes(randomBytes)
        val randomString = Base64.getEncoder().encodeToString(randomBytes)
        
        val sessionId = "${uuid}-${timestamp}-${randomString}".replace("=", "")
        return SessionId(sessionId)
    }
}