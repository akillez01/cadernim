package com.cadernim.app.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadernim.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import retrofit2.HttpException
import java.io.IOException
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val loggedIn = runCatching { authRepository.isLoggedIn() }.getOrDefault(false)
            _uiState.update { it.copy(isLoading = false, isSuccess = loggedIn) }
        }
    }

    fun onEmailChange(value: String) = _uiState.update { it.copy(email = value, error = null) }
    fun onPasswordChange(value: String) = _uiState.update { it.copy(password = value, error = null) }

    fun login() {
        val state = _uiState.value
        if (state.email.isBlank() || state.password.isBlank()) {
            _uiState.update { it.copy(error = "Preencha email e senha.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            authRepository.login(state.email.trim(), state.password)
                .onSuccess { _uiState.update { it.copy(isLoading = false, isSuccess = true) } }
                .onFailure { err ->
                    val message = when (err) {
                        is IOException -> "Sem conexão com o servidor."
                        is HttpException -> when (err.code()) {
                            400 -> "Email ou senha em formato inválido. Verifique os dados."
                            401 -> "Email ou senha incorretos."
                            else -> "Erro no servidor (${err.code()})."
                        }
                        else -> "Erro inesperado."
                    }
                    _uiState.update { it.copy(isLoading = false, error = message) }
                }
        }
    }
}
