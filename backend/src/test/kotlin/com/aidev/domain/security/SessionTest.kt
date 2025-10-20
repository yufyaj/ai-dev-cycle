package com.aidev.domain.security

import org.junit.jupiter.api.Test
import java.time.Instant
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SessionTest {

    @Test
    fun `should create valid session`() {
        val now = Instant.now()
        val session = Session(
            id = SessionId("session123"),
            userId = UserId(1L),
            createdAt = now,
            lastAccessedAt = now,
            expiresAt = now.plusSeconds(3600)
        )
        
        assertTrue(session.isValid(now))
        assertFalse(session.isExpired(now))
        assertFalse(session.isTimedOut(now))
    }

    @Test
    fun `should detect expired session`() {
        val now = Instant.now()
        val session = Session(
            id = SessionId("session123"),
            userId = UserId(1L),
            createdAt = now.minusSeconds(7200),
            lastAccessedAt = now.minusSeconds(7200),
            expiresAt = now.minusSeconds(3600)
        )
        
        assertTrue(session.isExpired(now))
        assertFalse(session.isValid(now))
    }

    @Test
    fun `should detect timed out session`() {
        val now = Instant.now()
        val session = Session(
            id = SessionId("session123"),
            userId = UserId(1L),
            createdAt = now.minusSeconds(7200),
            lastAccessedAt = now.minusSeconds(7200),
            expiresAt = now.plusSeconds(3600)
        )
        
        assertTrue(session.isTimedOut(now))
        assertFalse(session.isValid(now))
    }

    @Test
    fun `should update last accessed time`() {
        val past = Instant.now().minusSeconds(1800)
        val now = Instant.now()
        
        val session = Session(
            id = SessionId("session123"),
            userId = UserId(1L),
            createdAt = past,
            lastAccessedAt = past,
            expiresAt = past.plusSeconds(3600)
        )
        
        val updatedSession = session.updateLastAccessed(now)
        
        assertTrue(updatedSession.lastAccessedAt == now)
        assertTrue(updatedSession.expiresAt.isAfter(now))
    }

    @Test
    fun `should detect inactive session`() {
        val now = Instant.now()
        val session = Session(
            id = SessionId("session123"),
            userId = UserId(1L),
            createdAt = now,
            lastAccessedAt = now,
            expiresAt = now.plusSeconds(3600),
            isActive = false
        )
        
        assertFalse(session.isValid(now))
    }
}