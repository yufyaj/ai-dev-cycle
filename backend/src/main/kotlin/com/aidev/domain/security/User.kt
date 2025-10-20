package com.aidev.domain.security

data class User(
    val id: UserId,
    val username: Username,
    val hashedPassword: HashedPassword,
    val role: Role,
    val isActive: Boolean = true
) {
    fun hasRole(requiredRole: Role): Boolean {
        return role == requiredRole || role.hasPermission(requiredRole)
    }
}

@JvmInline
value class UserId(val value: Long)

@JvmInline
value class Username(val value: String) {
    init {
        require(value.isNotBlank()) { "Username cannot be blank" }
        require(value.length >= 3) { "Username must be at least 3 characters" }
        require(value.matches(Regex("^[a-zA-Z0-9_]+$"))) { "Username can only contain alphanumeric characters and underscores" }
    }
}

@JvmInline
value class HashedPassword(val value: String) {
    init {
        require(value.isNotBlank()) { "Hashed password cannot be blank" }
    }
}

enum class Role(val permissions: Set<Permission>) {
    USER(setOf(Permission.READ_OWN)),
    ADMIN(setOf(Permission.READ_OWN, Permission.READ_ALL, Permission.WRITE_ALL, Permission.DELETE_ALL));

    fun hasPermission(permission: Permission): Boolean {
        return permissions.contains(permission)
    }

    fun hasPermission(role: Role): Boolean {
        return role.permissions.all { permissions.contains(it) }
    }
}

enum class Permission {
    READ_OWN,
    READ_ALL,
    WRITE_ALL,
    DELETE_ALL
}