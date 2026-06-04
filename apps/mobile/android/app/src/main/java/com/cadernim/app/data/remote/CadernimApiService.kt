package com.cadernim.app.data.remote

import com.cadernim.app.data.remote.dto.AvaResponse
import com.cadernim.app.data.remote.dto.BookletsResponse
import com.cadernim.app.data.remote.dto.HymnResponse
import com.cadernim.app.data.remote.dto.HymnsResponse
import com.cadernim.app.data.remote.dto.LoginRequest
import com.cadernim.app.data.remote.dto.LoginResponse
import com.cadernim.app.data.remote.dto.PodcastsResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface CadernimApiService {

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("api/auth/me")
    suspend fun getMe(): LoginResponse

    @POST("api/auth/logout")
    suspend fun logout()

    @GET("api/hymns")
    suspend fun getHymns(
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
        @Query("tag") tag: String? = null
    ): HymnsResponse

    @GET("api/hymns/{id}")
    suspend fun getHymn(@Path("id") id: String): HymnResponse

    @GET("api/podcasts")
    suspend fun getPodcasts(): PodcastsResponse

    @GET("api/ava")
    suspend fun getAvaLessons(): AvaResponse

    @GET("api/booklets")
    suspend fun getBooklets(): BookletsResponse
}
