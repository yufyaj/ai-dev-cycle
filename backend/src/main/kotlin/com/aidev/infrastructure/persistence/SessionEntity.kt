package com.aidev.infrastructure.persistence

import com.aidev.domain.security.*
import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "sessions")
data class SessionEntity(
    @Id
    val id: String,
    
    @Column(nullable = false)
    val userId: Long,
    
    @Column(nullable = false)
    val createdAt: Instant,
    
    @Column(nullable = false)
    val lastAccessedAt: Instant,
    
    @Column(nullable = false)
    val expiresAt: Instant,
    
    @Column(nullable = false)
    val isActive: Boolean = true
) {
    fun toDomain(): Session {
        return Session(
            id = SessionId(id),
            userId = UserId(userId),
            createdAt = createdAt,
            lastAccessedAt = lastAccessedAt,
            expiresAt = expiresAt,
            isActive = isActive
        )
    }
    
    companion object {
        fun fromDomain(session: Session): SessionEntity {
            return SessionEntity(
                id = session.id.value,
                userId = session.userId.value,
                createdAt = session.createdAt,
                lastAccessedAt = session.lastAccessedAt,
                expiresAt = session.expiresAt,
                isActive = session.isActive
            )
        }
    }
}