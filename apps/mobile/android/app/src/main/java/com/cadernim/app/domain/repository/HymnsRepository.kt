package com.cadernim.app.domain.repository

import com.cadernim.app.domain.model.Hymn
import kotlinx.coroutines.flow.Flow

interface HymnsRepository {
    fun getHymns(search: String? = null): Flow<List<Hymn>>
    suspend fun syncHymns()
    suspend fun getHymnById(id: String): Hymn?
}
