package com.aidev.domain.security

interface InputSanitizer {
    fun sanitizeForHtml(input: String): String
    fun sanitizeForSql(input: String): String
    fun isValidInput(input: String): Boolean
}

data class SanitizedInput(val value: String) {
    companion object {
        fun from(input: String, sanitizer: InputSanitizer): SanitizedInput {
            require(sanitizer.isValidInput(input)) { "Input contains malicious content" }
            return SanitizedInput(sanitizer.sanitizeForHtml(input))
        }
    }
}