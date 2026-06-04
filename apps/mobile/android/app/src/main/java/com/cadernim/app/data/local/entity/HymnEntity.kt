package com.cadernim.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "hymns")
data class HymnEntity(
    @PrimaryKey val id: String,
    val title: String,
    val number: Int,
    val author: String,
    val originalKey: String,
    val defaultBpm: Int,
    val timeSignature: String,
    val category: String,
    val tagsJson: String,
    val cachedAt: Long = System.currentTimeMillis()
)
