package com.cadernim.app.domain.model

data class Hymn(
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
