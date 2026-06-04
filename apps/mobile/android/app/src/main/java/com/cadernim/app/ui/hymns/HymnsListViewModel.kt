package com.cadernim.app.ui.hymns

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadernim.app.domain.model.Hymn
import com.cadernim.app.domain.repository.HymnsRepository
import com.cadernim.app.domain.usecase.GetHymnsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HymnsUiState(
    val hymns: List<Hymn> = emptyList(),
    val searchQuery: String = "",
    val isSyncing: Boolean = false,
    val syncError: String? = null
)

@HiltViewModel
class HymnsListViewModel @Inject constructor(
    private val getHymnsUseCase: GetHymnsUseCase,
    private val repository: HymnsRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isSyncing = MutableStateFlow(false)
    private val _syncError = MutableStateFlow<String?>(null)

    @OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
    val uiState: StateFlow<HymnsUiState> = _searchQuery
        .debounce(300)
        .flatMapLatest { query -> getHymnsUseCase(query.takeIf { it.isNotBlank() }) }
        .combine(_searchQuery) { hymns, query -> hymns to query }
        .combine(_isSyncing) { (hymns, query), syncing -> Triple(hymns, query, syncing) }
        .combine(_syncError) { (hymns, query, syncing), error ->
            HymnsUiState(hymns = hymns, searchQuery = query, isSyncing = syncing, syncError = error)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HymnsUiState())

    init {
        sync()
    }

    fun onSearchChange(query: String) = _searchQuery.update { query }

    fun sync() {
        viewModelScope.launch {
            _isSyncing.value = true
            _syncError.value = null
            runCatching { repository.syncHymns() }
                .onFailure { _syncError.value = it.message }
            _isSyncing.value = false
        }
    }
}
