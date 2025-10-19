package com.formsales.infrastructure.user

import com.formsales.domain.user.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserRepository : JpaRepository<User, Long> {
    fun findByEmailAndIsActive(email: String, isActive: Boolean): User?
    fun existsByEmail(email: String): Boolean
}