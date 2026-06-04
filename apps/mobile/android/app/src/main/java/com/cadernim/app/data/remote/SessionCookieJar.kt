package com.cadernim.app.data.remote

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionCookieJar @Inject constructor(
    @ApplicationContext private val context: Context
) : CookieJar {

    private val prefs = context.getSharedPreferences("cadernim_session", Context.MODE_PRIVATE)
    private val store = mutableMapOf<String, MutableList<Cookie>>()

    init {
        // Restore persisted cookies on startup
        prefs.all.forEach { (key, value) ->
            if (value is String && key.contains("|")) {
                val (host, name) = key.split("|", limit = 2)
                val cookie = Cookie.Builder()
                    .name(name)
                    .value(value)
                    .domain(host)
                    .path("/")
                    .build()
                store.getOrPut(host) { mutableListOf() }.add(cookie)
            }
        }
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val host = url.host
        store[host] = cookies.toMutableList()
        val editor = prefs.edit()
        cookies.forEach { editor.putString("$host|${it.name}", it.value) }
        editor.apply()
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> =
        store[url.host] ?: emptyList()

    fun clear() {
        store.clear()
        prefs.edit().clear().apply()
    }

    fun hasSession(): Boolean = store.isNotEmpty() || prefs.all.isNotEmpty()
}
