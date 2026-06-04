package com.cadernim.app.data.remote.dto

data class BookletDto(
    val id: String,
    val title: String,
    val collection: String,
    val url: String
)

data class BookletCollectionDto(
    val id: String,
    val name: String,
    val items: List<BookletDto>
)

data class BookletsResponse(val data: List<BookletCollectionDto>)
