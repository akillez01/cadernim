package com.cadernim.app.data.repository

import com.cadernim.app.data.remote.CadernimApiService
import com.cadernim.app.data.remote.SessionCookieJar
import com.cadernim.app.data.remote.dto.LoginRequest
import com.cadernim.app.domain.repository.AuthRepository
import javax.inject.Inject

class AuthRepositoryImpl @Inject constructor(
    private val api: CadernimApiService,
    private val cookieJar: SessionCookieJar
) : AuthRepository {

    override suspend fun login(email: String, password: String): Result<Unit> =
        runCatching { api.login(LoginRequest(email, password)) }.map {}

    override suspend fun logout() {
        runCatching { api.logout() }
        cookieJar.clear()
    }

    override suspend fun isLoggedIn(): Boolean = runCatching { api.getMe() }.isSuccess
}
