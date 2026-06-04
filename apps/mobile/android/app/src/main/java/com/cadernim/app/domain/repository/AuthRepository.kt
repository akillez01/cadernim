package com.cadernim.app.domain.repository

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<Unit>
    suspend fun logout()
    suspend fun isLoggedIn(): Boolean
}
