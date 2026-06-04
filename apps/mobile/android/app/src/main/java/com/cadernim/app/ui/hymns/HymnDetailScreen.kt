package com.cadernim.app.ui.hymns

import android.annotation.SuppressLint
import android.content.Context
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun HymnDetailScreen(
    onBack: () -> Unit,
    viewModel: HymnDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.hymn?.title ?: "Hino") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Voltar")
                    }
                }
            )
        }
    ) { innerPadding ->
        AndroidView(
            factory = { ctx ->
                syncCookiesToWebView(ctx)
                WebView(ctx).apply {
                    with(settings) {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        mediaPlaybackRequiresUserGesture = false
                        // Viewport largo para OSMD renderizar partitura em tamanho legível
                        useWideViewPort = true
                        loadWithOverviewMode = true
                        // Pinch-zoom: usuário pode aproximar para ler notas
                        setSupportZoom(true)
                        builtInZoomControls = true
                        displayZoomControls = false
                        // Evita que o web app detecte WebView e altere o comportamento
                        userAgentString = "Mozilla/5.0 (Linux; Android 10; K) " +
                            "AppleWebKit/537.36 (KHTML, like Gecko) " +
                            "Chrome/125.0.0.0 Mobile Safari/537.36"
                    }
                    webChromeClient = WebChromeClient()
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            // Oculta o header da web e remove max-width para mais espaço na partitura
                            view?.evaluateJavascript(CSS_INJECT_JS, null)
                        }
                    }
                    loadUrl("https://cadernim.com.br/hymns/${viewModel.hymnId}")
                }
            },
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        )
    }
}

private val CSS_INJECT_JS = """
(function() {
    var s = document.createElement('style');
    s.textContent = [
        'header { display: none !important; }',
        'body > main { padding: 8px 4px !important; }',
        '.max-w-7xl { max-width: none !important; padding: 4px !important; }',
        '.max-w-4xl, .max-w-3xl, .max-w-2xl { max-width: none !important; }',
        'svg { width: 100% !important; height: auto !important; }',
        '#osmd-container, [class*="score"], [class*="Score"] { overflow-x: auto !important; }'
    ].join(' ');
    document.head.appendChild(s);
})();
""".trimIndent()

internal fun syncCookiesToWebView(context: Context) {
    val prefs = context.getSharedPreferences("cadernim_session", Context.MODE_PRIVATE)
    val cookieManager = CookieManager.getInstance()
    cookieManager.setAcceptCookie(true)
    prefs.all.forEach { (key, value) ->
        if (value is String && key.contains("|")) {
            val host = key.substringBefore("|")
            val name = key.substringAfter("|")
            cookieManager.setCookie("https://$host/", "$name=$value")
        }
    }
    cookieManager.flush()
}
