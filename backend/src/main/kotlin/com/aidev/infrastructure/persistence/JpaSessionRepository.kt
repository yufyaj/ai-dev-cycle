package com.aidev.infrastructure.persistence

import com.aidev.domain.security.Session
import com.aidev.domain.security.SessionId
import com.aidev.usecase.security.SessionRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

interface SessionJpaRepository : JpaRepository<SessionEntity, String> {
    @Modifying
    @Transactional
    @Query("DELETE FROM SessionEntity s WHERE s.expiresAt < :now OR s.lastAccessedAt < :timeoutThreshold")
    fun deleteExpiredSessions(now: Instant, timeoutThreshold: Instant): Int
}

@Repository
class JpaSessionRepository(
    private val jpaRepository: SessionJpaRepository
) : SessionRepository {

    override fun findById(sessionId: SessionId): Session? {
        return jpaRepository.findById(sessionId.value).orElse(null)?.toDomain()
    }

    override fun save(session: Session): Session {
        val entity = SessionEntity.fromDomain(session)
        val saved = jpaRepository.save(entity)
        return saved.toDomain()
    }

    override fun delete(sessionId: SessionId) {
        jpaRepository.deleteById(sessionId.value)
    }

    override fun deleteExpiredSessions() {
        val now = Instant.now()
        val timeoutThreshold = now.minusSeconds(Session.SESSION_TIMEOUT_HOURS * 3600)
        jpaRepository.deleteExpiredSessions(now, timeoutThreshold)
    }
}