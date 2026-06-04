package com.cadernim.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.cadernim.app.data.local.dao.HymnsDao
import com.cadernim.app.data.local.entity.HymnEntity

@Database(entities = [HymnEntity::class], version = 1, exportSchema = false)
abstract class CadernimDatabase : RoomDatabase() {
    abstract fun hymnsDao(): HymnsDao
}
