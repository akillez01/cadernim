package com.cadernim.app.ui.podcasts

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import coil.compose.AsyncImage
import com.cadernim.app.data.remote.CadernimApiService
import com.cadernim.app.data.remote.dto.PodcastDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PodcastsUiState(
    val episodes: List<PodcastDto> = emptyList(),
    val isLoading: Boolean = true,
    val playingId: String? = null
)

@HiltViewModel
class PodcastsViewModel @Inject constructor(
    private val api: CadernimApiService,
    private val player: ExoPlayer
) : ViewModel() {

    private val _uiState = MutableStateFlow(PodcastsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val episodes = runCatching { api.getPodcasts().data }.getOrDefault(emptyList())
            _uiState.value = PodcastsUiState(episodes = episodes, isLoading = false)
        }
    }

    fun togglePlay(episode: PodcastDto) {
        val url = episode.sourceUrl?.takeIf { it.isNotBlank() } ?: return
        val current = _uiState.value.playingId

        if (current == episode.id) {
            if (player.isPlaying) player.pause() else player.play()
            _uiState.value = _uiState.value.copy(
                playingId = if (player.isPlaying) episode.id else null
            )
        } else {
            player.setMediaItem(MediaItem.fromUri(url))
            player.prepare()
            player.play()
            _uiState.value = _uiState.value.copy(playingId = episode.id)
        }
    }

    override fun onCleared() {
        super.onCleared()
        player.stop()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PodcastsScreen(viewModel: PodcastsViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(topBar = {
        TopAppBar(title = { Text("Podcasts") })
    }) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }
        if (uiState.episodes.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Nenhum episódio disponível.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return@Scaffold
        }
        LazyColumn(
            modifier = Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(uiState.episodes, key = { it.id }) { episode ->
                PodcastEpisodeCard(
                    episode = episode,
                    isPlaying = uiState.playingId == episode.id,
                    hasAudio = !episode.sourceUrl.isNullOrBlank(),
                    onTogglePlay = { viewModel.togglePlay(episode) }
                )
            }
        }
    }
}

@Composable
private fun PodcastEpisodeCard(
    episode: PodcastDto,
    isPlaying: Boolean,
    hasAudio: Boolean,
    onTogglePlay: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isPlaying) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(if (isPlaying) 4.dp else 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AsyncImage(
                model = episode.coverImage,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(64.dp).clip(MaterialTheme.shapes.medium)
            )
            Column(Modifier.weight(1f)) {
                Text(
                    episode.series,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    episode.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(2.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(episode.host, style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (episode.durationLabel.isNotBlank() && episode.durationLabel != "00:00") {
                        Text("· ${episode.durationLabel}", style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (hasAudio) {
                FilledIconButton(onClick = onTogglePlay) {
                    Icon(
                        if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isPlaying) "Pausar" else "Reproduzir"
                    )
                }
            } else {
                Text(
                    "Em breve",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 8.dp)
                )
            }
        }
    }
}
