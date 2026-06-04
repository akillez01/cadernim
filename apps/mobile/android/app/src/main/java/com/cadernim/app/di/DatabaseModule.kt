package com.cadernim.app.di

import android.content.Context
import androidx.room.Room
import com.cadernim.app.data.local.CadernimDatabase
import com.cadernim.app.data.local.dao.HymnsDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): CadernimDatabase =
        Room.databaseBuilder(context, CadernimDatabase::class.java, "cadernim.db").build()

    @Provides
    fun provideHymnsDao(db: CadernimDatabase): HymnsDao = db.hymnsDao()
}
