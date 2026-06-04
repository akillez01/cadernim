package com.cadernim.app.ui.ava

import android.annotation.SuppressLint
import android.net.Uri
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AssistChip
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.cadernim.app.data.remote.dto.AvaLessonDto

object PendingLesson {
    var lesson: AvaLessonDto? = null
}

private const val MOBILE_UA =
    "Mozilla/5.0 (Linux; Android 13; SM-A225M) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"

// Injeta no onPageFinished — esconde header, nav e conteúdo abaixo do player
private const val HIDE_YT_CHROME_JS = """
(function() {
  var s = document.createElement('style');
  s.textContent =
    'ytm-mobile-topbar-renderer { display:none !important; }' +
    'ytm-pivot-bar-renderer { display:none !important; }' +
    'ytm-watch-below-the-fold-renderer { display:none !important; }' +
    'ytm-slim-video-metadata-section-renderer { display:none !important; }' +
    '.watch-below-the-fold { display:none !important; }' +
    'body { overflow:hidden !important; margin:0 !important; padding:0 !important; }' +
    'ytm-app { overflow:hidden !important; }';
  document.head && document.head.appendChild(s);
})();
"""

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AvaPlayerScreen(onBack: () -> Unit) {
    val lesson  = PendingLesson.lesson
    val videoId = extractVideoId(lesson?.sourceUrl.orEmpty())
    val targetUrl = if (videoId.isNotBlank())
        "https://m.youtube.com/watch?v=$videoId"
    else lesson?.sourceUrl ?: ""

    var webView by remember { mutableStateOf<WebView?>(null) }

    BackHandler(enabled = webView?.canGoBack() == true) {
        webView?.goBack()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        lesson?.title.orEmpty(),
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            // ── Player 16:9 ──────────────────────────────────────────────
            AndroidView(
                factory = { ctx ->
                    WebView(ctx).apply {
                        settings.apply {
                            javaScriptEnabled                = true
                            domStorageEnabled                = true
                            mediaPlaybackRequiresUserGesture = false
                            useWideViewPort                  = true
                            loadWithOverviewMode             = true
                            userAgentString                  = MOBILE_UA
                            setSupportZoom(false)
                            builtInZoomControls              = false
                        }
                        webChromeClient = WebChromeClient()
                        webViewClient   = object : WebViewClient() {
                            override fun onPageFinished(view: WebView?, url: String?) {
                                view?.evaluateJavascript(HIDE_YT_CHROME_JS, null)
                            }
                        }
                        loadUrl(targetUrl)
                        webView = this
                    }
                },
                update = { webView = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
            )

            // ── Conteúdo da aula ─────────────────────────────────────────
            if (lesson != null) {
                Column(modifier = Modifier.padding(16.dp)) {

                    Text(
                        text  = lesson.title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(Modifier.height(8.dp))

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                lesson.teacher,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (lesson.durationLabel.isNotBlank() && lesson.durationLabel != "YouTube") {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.Schedule,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    lesson.durationLabel,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(4.dp))

                    Text(
                        text  = "${lesson.module} · Nível: ${lesson.level}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )

                    if (lesson.description.isNotBlank()) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                        Text(
                            text  = "Sobre esta aula",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text  = lesson.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (lesson.tags.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            lesson.tags.forEach { tag ->
                                AssistChip(
                                    onClick = {},
                                    label  = { Text(tag, style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun extractVideoId(url: String): String {
    if (url.isBlank()) return ""
    val uri = runCatching { Uri.parse(url) }.getOrNull() ?: return ""
    return when {
        url.contains("youtube.com/watch")   -> uri.getQueryParameter("v").orEmpty()
        url.contains("youtu.be/")           -> uri.lastPathSegment.orEmpty()
        url.contains("youtube.com/embed/")  -> uri.pathSegments.getOrNull(1).orEmpty()
        url.contains("youtube.com/shorts/") -> uri.lastPathSegment.orEmpty()
        else                                -> ""
    }
}
