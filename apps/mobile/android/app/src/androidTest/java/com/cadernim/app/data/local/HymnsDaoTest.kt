package com.cadernim.app.data.local

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.cadernim.app.data.local.dao.HymnsDao
import com.cadernim.app.data.local.entity.HymnEntity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HymnsDaoTest {

    private lateinit var db: CadernimDatabase
    private lateinit var dao: HymnsDao

    @Before
    fun setUp() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            CadernimDatabase::class.java
        ).allowMainThreadQueries().build()
        dao = db.hymnsDao()
    }

    @After
    fun tearDown() = db.close()

    @Test
    fun upsert_and_getAll_returnsInsertedHymns() = runTest {
        dao.upsertHymns(listOf(hymnA, hymnB))

        val all = dao.getAllHymns().first()
        assertEquals(2, all.size)
        // Ordenados por number ASC
        assertEquals("cruzeirinho-001", all[0].id)
        assertEquals("cruzeirinho-003", all[1].id)
    }

    @Test
    fun upsert_updatesExistingRecord() = runTest {
        dao.upsertHymns(listOf(hymnA))
        dao.upsertHymns(listOf(hymnA.copy(title = "Dou viva (atualizado)")))

        val all = dao.getAllHymns().first()
        assertEquals(1, all.size)
        assertEquals("Dou viva (atualizado)", all[0].title)
    }

    @Test
    fun search_returnsMatchingHymns() = runTest {
        dao.upsertHymns(listOf(hymnA, hymnB, hymnC))

        val results = dao.searchHymns("Confia").first()
        assertEquals(1, results.size)
        assertEquals("cruzeirinho-003", results[0].id)
    }

    @Test
    fun search_byAuthor() = runTest {
        dao.upsertHymns(listOf(hymnA, hymnB, hymnC))

        val results = dao.searchHymns("Mestre Irineu").first()
        assertEquals(3, results.size)
    }

    @Test
    fun getHymnById_returnsCorrectHymn() = runTest {
        dao.upsertHymns(listOf(hymnA, hymnB))

        val found = dao.getHymnById("cruzeirinho-003")
        assertNotNull(found)
        assertEquals("Confia", found!!.title)
    }

    @Test
    fun getHymnById_returnsNullWhenNotFound() = runTest {
        val found = dao.getHymnById("does-not-exist")
        assertNull(found)
    }

    @Test
    fun clearAll_removesAllRecords() = runTest {
        dao.upsertHymns(listOf(hymnA, hymnB))
        dao.clearAll()

        val all = dao.getAllHymns().first()
        assertTrue(all.isEmpty())
    }
}

private val hymnA = HymnEntity(
    id = "cruzeirinho-001",
    title = "Dou viva a Deus nas Alturas",
    number = 1,
    author = "Mestre Irineu",
    originalKey = "G",
    defaultBpm = 80,
    timeSignature = "2/4",
    category = "Mestre Irineu - Cruzeirinho",
    tagsJson = "[\"cruzeirinho\"]"
)

private val hymnB = HymnEntity(
    id = "cruzeirinho-003",
    title = "Confia",
    number = 3,
    author = "Mestre Irineu",
    originalKey = "C",
    defaultBpm = 76,
    timeSignature = "2/4",
    category = "Mestre Irineu - Cruzeirinho",
    tagsJson = "[\"cruzeirinho\"]"
)

private val hymnC = HymnEntity(
    id = "oracao-001",
    title = "Examine a Consciência",
    number = 1,
    author = "Mestre Irineu",
    originalKey = "D",
    defaultBpm = 72,
    timeSignature = "4/4",
    category = "Oração",
    tagsJson = "[\"oracao\"]"
)
