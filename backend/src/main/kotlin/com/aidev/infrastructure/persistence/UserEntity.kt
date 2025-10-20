package com.aidev.infrastructure.persistence

import com.aidev.domain.security.*
import jakarta.persistence.*

@Entity
@Table(name = "users")
data class UserEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    
    @Column(unique = true, nullable = false)
    val username: String,
    
    @Column(nullable = false)
    val hashedPassword: String,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val role: RoleEntity,
    
    @Column(nullable = false)
    val isActive: Boolean = true
) {
    fun toDomain(): User {
        return User(
            id = UserId(id),
            username = Username(username),
            hashedPassword = HashedPassword(hashedPassword),
            role = role.toDomain(),
            isActive = isActive
        )
    }
    
    companion object {
        fun fromDomain(user: User): UserEntity {
            return UserEntity(
                id = user.id.value,
                username = user.username.value,
                hashedPassword = user.hashedPassword.value,
                role = RoleEntity.fromDomain(user.role),
                isActive = user.isActive
            )
        }
    }
}

enum class RoleEntity {
    USER, ADMIN;
    
    fun toDomain(): Role {
        return when (this) {
            USER -> Role.USER
            ADMIN -> Role.ADMIN
        }
    }
    
    companion object {
        fun fromDomain(role: Role): RoleEntity {
            return when (role) {
                Role.USER -> USER
                Role.ADMIN -> ADMIN
            }
        }
    }
}