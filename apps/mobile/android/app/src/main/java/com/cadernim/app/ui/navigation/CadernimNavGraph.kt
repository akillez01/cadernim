package com.cadernim.app.ui.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayLesson
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavController
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.cadernim.app.ui.ava.AvaPlayerScreen
import com.cadernim.app.ui.ava.AvaScreen
import com.cadernim.app.ui.ava.PendingLesson
import com.cadernim.app.ui.booklets.BookletsScreen
import com.cadernim.app.ui.booklets.PdfViewerScreen
import com.cadernim.app.ui.booklets.PendingBooklet
import com.cadernim.app.ui.hymns.HymnDetailScreen
import com.cadernim.app.ui.hymns.HymnsListScreen
import com.cadernim.app.ui.login.LoginScreen
import com.cadernim.app.ui.player.MiniPlayerBar
import com.cadernim.app.ui.podcasts.PodcastsScreen

private object Routes {
    const val LOGIN         = "login"
    const val HYMNS         = "hymns"
    const val HYMN_DETAIL   = "hymns/{hymnId}"
    const val AVA           = "ava"
    const val PODCASTS      = "podcasts"
    const val BOOKLETS      = "booklets"
    const val PDF_VIEWER    = "pdf-viewer"
    const val LESSON_PLAYER = "lesson-player"

    fun hymnDetail(id: String) = "hymns/$id"
}

private data class BottomNavItem(val route: String, val label: String, val icon: ImageVector)

private val bottomNavItems = listOf(
    BottomNavItem(Routes.HYMNS,    "Hinário",  Icons.Default.Home),
    BottomNavItem(Routes.AVA,      "Aulas",    Icons.Default.PlayLesson),
    BottomNavItem(Routes.PODCASTS, "Podcasts", Icons.Default.Mic),
    BottomNavItem(Routes.BOOKLETS, "Cifras",   Icons.AutoMirrored.Filled.MenuBook)
)

@Composable
fun CadernimNavGraph() {
    val rootNav = rememberNavController()

    NavHost(navController = rootNav, startDestination = Routes.LOGIN) {

        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    rootNav.navigate(Routes.HYMNS) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.HYMNS)    { MainScaffold(startRoute = Routes.HYMNS,    rootNav = rootNav) }
        composable(Routes.AVA)      { MainScaffold(startRoute = Routes.AVA,      rootNav = rootNav) }
        composable(Routes.PODCASTS) { MainScaffold(startRoute = Routes.PODCASTS, rootNav = rootNav) }
        composable(Routes.BOOKLETS) { MainScaffold(startRoute = Routes.BOOKLETS, rootNav = rootNav) }

        composable(
            route = Routes.HYMN_DETAIL,
            arguments = listOf(navArgument("hymnId") { type = NavType.StringType })
        ) {
            HymnDetailScreen(onBack = { rootNav.popBackStack() })
        }

        composable(Routes.LESSON_PLAYER) {
            AvaPlayerScreen(onBack = { rootNav.popBackStack() })
        }

        // Viewer de PDF — tela cheia sem bottom bar
        composable(Routes.PDF_VIEWER) {
            PdfViewerScreen(onBack = { rootNav.popBackStack() })
        }
    }
}

@Composable
private fun MainScaffold(startRoute: String, rootNav: NavController) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    Scaffold(
        bottomBar = {
            Column {
                MiniPlayerBar()
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        NavigationBarItem(
                            icon  = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label) },
                            selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState    = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController    = navController,
            startDestination = startRoute,
            modifier         = Modifier.padding(innerPadding)
        ) {
            composable(Routes.HYMNS) {
                HymnsListScreen(
                    onHymnClick = { id -> navController.navigate(Routes.hymnDetail(id)) }
                )
            }
            composable(
                route     = Routes.HYMN_DETAIL,
                arguments = listOf(navArgument("hymnId") { type = NavType.StringType })
            ) {
                HymnDetailScreen(onBack = { navController.popBackStack() })
            }
            composable(Routes.AVA) {
                AvaScreen(
                    onWatchLesson = { lesson ->
                        PendingLesson.lesson = lesson
                        rootNav.navigate(Routes.LESSON_PLAYER)
                    }
                )
            }
            composable(Routes.PODCASTS) { PodcastsScreen() }
            composable(Routes.BOOKLETS) {
                BookletsScreen(
                    onOpenPdf = { booklet ->
                        PendingBooklet.booklet = booklet
                        rootNav.navigate(Routes.PDF_VIEWER)
                    }
                )
            }
        }
    }
}
