package com.cadernim.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.cadernim.app.data.local.entity.HymnEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface HymnsDao {

    @Query("SELECT * FROM hymns ORDER BY number ASC")
    fun getAllHymns(): Flow<List<HymnEntity>>

    @Query("""
        SELECT * FROM hymns
        WHERE title LIKE '%' || :search || '%'
           OR author LIKE '%' || :search || '%'
        ORDER BY number ASC
    """)
    fun searchHymns(search: String): Flow<List<HymnEntity>>

    @Query("SELECT * FROM hymns WHERE id = :id")
    suspend fun getHymnById(id: String): HymnEntity?

    @Upsert
    suspend fun upsertHymns(hymns: List<HymnEntity>)

    @Query("DELETE FROM hymns")
    suspend fun clearAll()
}
