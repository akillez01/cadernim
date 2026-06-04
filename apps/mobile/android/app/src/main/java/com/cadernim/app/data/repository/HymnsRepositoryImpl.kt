package com.cadernim.app.data.repository

import com.cadernim.app.data.local.dao.HymnsDao
import com.cadernim.app.data.local.entity.HymnEntity
import com.cadernim.app.data.remote.CadernimApiService
import com.cadernim.app.data.remote.dto.HymnDto
import com.cadernim.app.domain.model.Hymn
import com.cadernim.app.domain.repository.HymnsRepository
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class HymnsRepositoryImpl @Inject constructor(
    private val dao: HymnsDao,
    private val api: CadernimApiService,
    private val gson: Gson
) : HymnsRepository {

    override fun getHymns(search: String?): Flow<List<Hymn>> {
        val flow = if (search.isNullOrBlank()) dao.getAllHymns() else dao.searchHymns(search)
        return flow.map { entities -> entities.map { it.toDomain() } }
    }

    override suspend fun syncHymns() {
        val hymns = api.getHymns().data
        dao.clearAll()
        dao.upsertHymns(hymns.map { it.toEntity() })
    }

    override suspend fun getHymnById(id: String): Hymn? = dao.getHymnById(id)?.toDomain()

    private fun HymnEntity.toDomain(): Hymn {
        val tagType = object : TypeToken<List<String>>() {}.type
        return Hymn(
            id = id, title = title, number = number, author = author,
            originalKey = originalKey, defaultBpm = defaultBpm,
            timeSignature = timeSignature, category = category,
            tags = gson.fromJson(tagsJson, tagType)
        )
    }

    private fun HymnDto.toEntity() = HymnEntity(
        id = id, title = title, number = number, author = author,
        originalKey = originalKey, defaultBpm = defaultBpm,
        timeSignature = timeSignature, category = category,
        tagsJson = gson.toJson(tags)
    )
}
