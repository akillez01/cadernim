package com.cadernim.app.ui.hymns

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadernim.app.domain.model.Hymn
import com.cadernim.app.domain.repository.HymnsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HymnDetailUiState(
    val hymn: Hymn? = null,
    val isLoading: Boolean = true,
    val error: String? = null
)

@HiltViewModel
class HymnDetailViewModel @Inject constructor(
    private val repository: HymnsRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    val hymnId: String = checkNotNull(savedStateHandle["hymnId"])

    private val _uiState = MutableStateFlow(HymnDetailUiState())
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val hymn = runCatching { repository.getHymnById(hymnId) }.getOrNull()
            _uiState.value = if (hymn != null) {
                HymnDetailUiState(hymn = hymn, isLoading = false)
            } else {
                HymnDetailUiState(isLoading = false, error = "Hino não encontrado.")
            }
        }
    }
}
