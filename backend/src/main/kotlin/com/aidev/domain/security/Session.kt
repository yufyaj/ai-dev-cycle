package com.aidev.domain.security

import java.time.Instant

data class Session(
    val id: SessionId,
    val userId: UserId,
    val createdAt: Instant,
    val lastAccessedAt: Instant,
    val expiresAt: Instant,
    val isActive: Boolean = true
) {
    companion object {
        const val SESSION_TIMEOUT_HOURS = 1L
    }

    fun isExpired(now: Instant = Instant.now()): Boolean {
        return now.isAfter(expiresAt)
    }

    fun isTimedOut(now: Instant = Instant.now()): Boolean {
        return now.isAfter(lastAccessedAt.plusSeconds(SESSION_TIMEOUT_HOURS * 3600))
    }

    fun updateLastAccessed(now: Instant = Instant.now()): Session {
        return copy(
            lastAccessedAt = now,
            expiresAt = now.plusSeconds(SESSION_TIMEOUT_HOURS * 3600)
        )
    }

    fun isValid(now: Instant = Instant.now()): Boolean {
        return isActive && !isExpired(now) && !isTimedOut(now)
    }
}

@JvmInline
value class SessionId(val value: String) {
    init {
        require(value.isNotBlank()) { "Session ID cannot be blank" }
    }
}