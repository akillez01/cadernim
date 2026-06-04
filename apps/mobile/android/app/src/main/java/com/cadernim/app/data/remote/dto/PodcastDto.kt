package com.cadernim.app.data.remote.dto

data class PodcastDto(
    val id: String,
    val series: String,
    val order: Int,
    val title: String,
    val host: String,
    val level: String,
    val durationLabel: String,
    val publishedLabel: String,
    val description: String,
    val tags: List<String>,
    val coverImage: String?,
    val sourceUrl: String?,
    val sourceType: String
)

data class PodcastsResponse(val data: List<PodcastDto>)

data class AvaLessonDto(
    val id: String,
    val module: String,
    val order: Int,
    val title: String,
    val teacher: String,
    val level: String,
    val durationLabel: String,
    val description: String,
    val tags: List<String>,
    val thumbnail: String?,
    val sourceUrl: String?,
    val sourceType: String
)

data class AvaResponse(val data: List<AvaLessonDto>)
