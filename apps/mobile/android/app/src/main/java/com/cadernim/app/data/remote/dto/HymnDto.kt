package com.cadernim.app.data.remote.dto

data class HymnDto(
    val id: String,
    val title: String,
    val number: Int,
    val author: String,
    val originalKey: String,
    val defaultBpm: Int,
    val timeSignature: String,
    val category: String,
    val tags: List<String>
)

data class HymnsResponse(val data: List<HymnDto>)
data class HymnResponse(val data: HymnDto)

data class LoginRequest(val email: String, val password: String)

data class UserDto(
    val id: String,
    val name: String,
    val email: String,
    val role: String
)

data class LoginResponse(val data: UserDto)
