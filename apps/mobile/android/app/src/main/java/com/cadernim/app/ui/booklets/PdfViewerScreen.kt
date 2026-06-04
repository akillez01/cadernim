package com.cadernim.app.ui.booklets

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cadernim.app.data.remote.dto.BookletDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import javax.inject.Inject

object PendingBooklet {
    var booklet: BookletDto? = null
}

sealed class PdfViewerState {
    object Loading : PdfViewerState()
    data class Downloading(val progress: Float) : PdfViewerState()
    data class Ready(val pages: List<Bitmap>) : PdfViewerState()
    data class Error(val message: String) : PdfViewerState()
}

@HiltViewModel
class PdfViewerViewModel @Inject constructor(
    private val okHttpClient: OkHttpClient
) : ViewModel() {

    private val _state = MutableStateFlow<PdfViewerState>(PdfViewerState.Loading)
    val state = _state.asStateFlow()

    fun load(booklet: BookletDto, cacheDir: File) {
        viewModelScope.launch {
            _state.value = PdfViewerState.Downloading(0f)
            runCatching {
                val file = downloadToCache(booklet, cacheDir)
                val pages = renderPages(file)
                _state.value = PdfViewerState.Ready(pages)
            }.onFailure {
                _state.value = PdfViewerState.Error(it.message ?: "Erro ao carregar PDF")
            }
        }
    }

    private suspend fun downloadToCache(booklet: BookletDto, cacheDir: File): File =
        withContext(Dispatchers.IO) {
            val fileName = booklet.id.replace("/", "_") + ".pdf"
            val file = File(cacheDir, fileName)
            if (file.exists() && file.length() > 0) return@withContext file

            val url = "https://cadernim.com.br${booklet.url}"
            val response = okHttpClient.newCall(Request.Builder().url(url).build()).execute()
            val body = response.body ?: error("Resposta vazia do servidor")
            val total = body.contentLength().takeIf { it > 0 } ?: 1L
            var downloaded = 0L

            file.outputStream().use { out ->
                body.byteStream().use { input ->
                    val buffer = ByteArray(8192)
                    var read: Int
                    while (input.read(buffer).also { read = it } != -1) {
                        out.write(buffer, 0, read)
                        downloaded += read
                        _state.value = PdfViewerState.Downloading(downloaded / total.toFloat())
                    }
                }
            }
            file
        }

    private suspend fun renderPages(file: File): List<Bitmap> =
        withContext(Dispatchers.IO) {
            val pages = mutableListOf<Bitmap>()
            val fd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
            val renderer = PdfRenderer(fd)
            val screenWidth = 1080

            for (i in 0 until renderer.pageCount) {
                val page = renderer.openPage(i)
                val ratio = page.height.toFloat() / page.width.toFloat()
                val bmp = Bitmap.createBitmap(
                    screenWidth,
                    (screenWidth * ratio).toInt(),
                    Bitmap.Config.ARGB_8888
                )
                bmp.eraseColor(android.graphics.Color.WHITE)
                page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                page.close()
                pages.add(bmp)
            }
            renderer.close()
            fd.close()
            pages
        }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PdfViewerScreen(
    onBack: () -> Unit,
    viewModel: PdfViewerViewModel = hiltViewModel()
) {
    val booklet = PendingBooklet.booklet
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()

    LaunchedEffect(booklet) {
        if (booklet != null) viewModel.load(booklet, context.cacheDir)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        booklet?.title.orEmpty(),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFF1C1C1C))
        ) {
            when (val s = state) {
                is PdfViewerState.Loading -> CircularProgressIndicator(
                    Modifier.align(Alignment.Center),
                    color = Color.White
                )

                is PdfViewerState.Downloading -> Column(
                    Modifier
                        .align(Alignment.Center)
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Carregando hinário...", color = Color.White)
                    Spacer(Modifier.height(12.dp))
                    LinearProgressIndicator(
                        progress = { s.progress },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text(
                        "${(s.progress * 100).toInt()}%",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                is PdfViewerState.Error -> Text(
                    s.message,
                    color = Color(0xFFFF6B6B),
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp)
                )

                is PdfViewerState.Ready -> PdfPager(pages = s.pages)
            }
        }
    }
}

@Composable
private fun PdfPager(pages: List<Bitmap>) {
    val pagerState = rememberPagerState { pages.size }
    val scope = rememberCoroutineScope()

    // Estado de zoom — quando zoomed in desabilita swipe do pager
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    // Hint de navegação — some após 3 segundos
    var showHint by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        delay(3000)
        showHint = false
    }

    fun goNext() {
        if (pagerState.currentPage < pages.lastIndex)
            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
    }

    fun goPrev() {
        if (pagerState.currentPage > 0)
            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
    }

    Box(modifier = Modifier.fillMaxSize()) {

        HorizontalPager(
            state = pagerState,
            userScrollEnabled = scale == 1f, // bloqueia swipe quando está com zoom
            modifier = Modifier.fillMaxSize()
        ) { pageIndex ->
            // Reseta zoom ao trocar de página
            LaunchedEffect(pageIndex) {
                scale = 1f
                offset = Offset.Zero
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    // Pinch-to-zoom
                    .pointerInput(Unit) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            scale = (scale * zoom).coerceIn(1f, 4f)
                            offset = if (scale == 1f) Offset.Zero else offset + pan
                        }
                    }
                    // Duplo toque: direita = próxima, esquerda = anterior
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onDoubleTap = { tapOffset ->
                                if (tapOffset.x > size.width / 2f) goNext() else goPrev()
                                showHint = false
                            }
                        )
                    },
                contentAlignment = Alignment.Center
            ) {
                Image(
                    bitmap = pages[pageIndex].asImageBitmap(),
                    contentDescription = "Página ${pageIndex + 1}",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer(
                            scaleX = scale,
                            scaleY = scale,
                            translationX = offset.x,
                            translationY = offset.y
                        )
                )
            }
        }

        // ── Indicador de página ──────────────────────────────────────────
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp),
            shape = RoundedCornerShape(20.dp),
            color = Color.Black.copy(alpha = 0.6f),
            tonalElevation = 0.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = ::goPrev,
                    modifier = Modifier.size(32.dp),
                    enabled = pagerState.currentPage > 0
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        contentDescription = "Anterior",
                        tint = if (pagerState.currentPage > 0) Color.White else Color.White.copy(alpha = 0.3f)
                    )
                }

                Text(
                    text = "${pagerState.currentPage + 1}  /  ${pages.size}",
                    color = Color.White,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold
                )

                IconButton(
                    onClick = ::goNext,
                    modifier = Modifier.size(32.dp),
                    enabled = pagerState.currentPage < pages.lastIndex
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = "Próxima",
                        tint = if (pagerState.currentPage < pages.lastIndex) Color.White else Color.White.copy(alpha = 0.3f)
                    )
                }
            }
        }

        // ── Hint inicial (some em 3s) ────────────────────────────────────
        AnimatedVisibility(
            visible = showHint,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.Center)
        ) {
            Row(
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.65f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    "2 toques para trocar página",
                    color = Color.White,
                    style = MaterialTheme.typography.bodySmall
                )
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
