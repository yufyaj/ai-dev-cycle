package com.aidev.infrastructure.persistence

import com.aidev.domain.security.User
import com.aidev.domain.security.UserId
import com.aidev.domain.security.Username
import com.aidev.usecase.security.UserRepository
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

interface UserJpaRepository : JpaRepository<UserEntity, Long> {
    fun findByUsername(username: String): UserEntity?
}

@Repository
class JpaUserRepository(
    private val jpaRepository: UserJpaRepository
) : UserRepository {

    override fun findByUsername(username: Username): User? {
        return jpaRepository.findByUsername(username.value)?.toDomain()
    }

    override fun findById(userId: UserId): User? {
        return jpaRepository.findById(userId.value).orElse(null)?.toDomain()
    }

    override fun save(user: User): User {
        val entity = UserEntity.fromDomain(user)
        val saved = jpaRepository.save(entity)
        return saved.toDomain()
    }
}