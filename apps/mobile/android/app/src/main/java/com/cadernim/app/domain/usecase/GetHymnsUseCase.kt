package com.cadernim.app.domain.usecase

import com.cadernim.app.domain.model.Hymn
import com.cadernim.app.domain.repository.HymnsRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetHymnsUseCase @Inject constructor(
    private val repository: HymnsRepository
) {
    operator fun invoke(search: String? = null): Flow<List<Hymn>> = repository.getHymns(search)
}
