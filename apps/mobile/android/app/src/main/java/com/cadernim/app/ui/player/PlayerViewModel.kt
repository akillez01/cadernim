package com.cadernim.app.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlayerUiState(
    val isPlaying: Boolean = false,
    val currentHymnId: String? = null,
    val currentTitle: String = "",
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val isBuffering: Boolean = false
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    val player: ExoPlayer
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    private val listener = object : Player.Listener {
        override fun onIsPlayingChanged(isPlaying: Boolean) {
            _uiState.value = _uiState.value.copy(isPlaying = isPlaying)
        }

        override fun onPlaybackStateChanged(state: Int) {
            _uiState.value = _uiState.value.copy(
                isBuffering = state == Player.STATE_BUFFERING,
                durationMs = player.duration.coerceAtLeast(0L)
            )
        }
    }

    init {
        player.addListener(listener)
        startPositionPolling()
    }

    private fun startPositionPolling() {
        viewModelScope.launch {
            while (true) {
                if (player.isPlaying) {
                    _uiState.value = _uiState.value.copy(
                        positionMs = player.currentPosition,
                        durationMs = player.duration.coerceAtLeast(0L)
                    )
                }
                delay(500L)
            }
        }
    }

    fun play(hymnId: String, title: String, audioUrl: String) {
        if (_uiState.value.currentHymnId == hymnId && player.isPlaying) {
            player.pause()
            return
        }
        player.setMediaItem(MediaItem.fromUri(audioUrl))
        player.prepare()
        player.play()
        _uiState.value = _uiState.value.copy(
            currentHymnId = hymnId,
            currentTitle = title
        )
    }

    fun togglePlayPause() {
        if (player.isPlaying) player.pause() else player.play()
    }

    fun seekTo(positionMs: Long) {
        player.seekTo(positionMs)
        _uiState.value = _uiState.value.copy(positionMs = positionMs)
    }

    fun stop() {
        player.stop()
        _uiState.value = PlayerUiState()
    }

    override fun onCleared() {
        super.onCleared()
        player.removeListener(listener)
    }
}
