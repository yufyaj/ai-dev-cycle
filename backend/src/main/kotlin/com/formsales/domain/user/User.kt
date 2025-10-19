package com.formsales.domain.user

import jakarta.persistence.*

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,
    
    @Column(unique = true, nullable = false)
    val email: String,
    
    @Column(nullable = false)
    val passwordHash: String,
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    val role: UserRole,
    
    @Column
    val name: String? = null,
    
    @Column(nullable = false)
    val isActive: Boolean = true
) {
    fun hasRole(role: UserRole): Boolean = this.role == role
    
    fun isAdmin(): Boolean = role == UserRole.ADMIN
    fun isWorker(): Boolean = role == UserRole.WORKER
    fun isClient(): Boolean = role == UserRole.CLIENT
}

enum class UserRole {
    ADMIN, WORKER, CLIENT
}