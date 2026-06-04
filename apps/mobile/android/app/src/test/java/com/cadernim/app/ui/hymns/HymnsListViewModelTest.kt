package com.cadernim.app.ui.hymns

import com.cadernim.app.domain.model.Hymn
import com.cadernim.app.domain.repository.HymnsRepository
import com.cadernim.app.domain.usecase.GetHymnsUseCase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HymnsListViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private lateinit var fakeRepo: FakeHymnsRepository
    private lateinit var viewModel: HymnsListViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        fakeRepo = FakeHymnsRepository()
        viewModel = HymnsListViewModel(GetHymnsUseCase(fakeRepo), fakeRepo)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state loads hymns from repository`() = runTest {
        fakeRepo.setHymns(sampleHymns)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(sampleHymns.size, state.hymns.size)
        assertFalse(state.isSyncing)
    }

    @Test
    fun `search filters hymns by title`() = runTest {
        fakeRepo.setHymns(sampleHymns)
        viewModel.onSearchChange("Confia")
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.hymns.all { it.title.contains("Confia", ignoreCase = true) })
    }

    @Test
    fun `sync sets isSyncing true then false`() = runTest {
        viewModel.sync()
        // After sync completes
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isSyncing)
        assertNull(state.syncError)
    }

    @Test
    fun `sync error is captured in state`() = runTest {
        fakeRepo.failNextSync = true
        viewModel.sync()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isSyncing)
        assertEquals("sync failed", state.syncError)
    }
}

// --- fakes ---

private val sampleHymns = listOf(
    Hymn("cruzeirinho-001", "Dou viva a Deus", 1, "Mestre Irineu", "G", 80, "2/4", "Mestre Irineu - Cruzeirinho", listOf("cruzeirinho")),
    Hymn("cruzeirinho-003", "Confia", 3, "Mestre Irineu", "C", 76, "2/4", "Mestre Irineu - Cruzeirinho", listOf("cruzeirinho")),
    Hymn("oracao-001",      "Examine a Consciência", 1, "Mestre Irineu", "D", 72, "4/4", "Oração", listOf("oracao"))
)

private class FakeHymnsRepository : HymnsRepository {
    private val _hymns = MutableStateFlow<List<Hymn>>(emptyList())
    var failNextSync = false

    fun setHymns(hymns: List<Hymn>) { _hymns.value = hymns }

    override fun getHymns(search: String?) = if (search.isNullOrBlank()) {
        _hymns
    } else {
        MutableStateFlow(_hymns.value.filter {
            it.title.contains(search, ignoreCase = true) || it.author.contains(search, ignoreCase = true)
        })
    }

    override suspend fun syncHymns() {
        if (failNextSync) {
            failNextSync = false
            throw Exception("sync failed")
        }
    }

    override suspend fun getHymnById(id: String) = _hymns.value.find { it.id == id }
}
