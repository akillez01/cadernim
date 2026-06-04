package com.cadernim.app.di

import com.cadernim.app.data.repository.AuthRepositoryImpl
import com.cadernim.app.data.repository.HymnsRepositoryImpl
import com.cadernim.app.domain.repository.AuthRepository
import com.cadernim.app.domain.repository.HymnsRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindHymnsRepository(impl: HymnsRepositoryImpl): HymnsRepository

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository
}
