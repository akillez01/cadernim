package com.cadernim.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val LightColors = lightColorScheme(
    primary = PrimaryGreen,
    onPrimary = OnPrimary,
    primaryContainer = PrimaryGreenLight,
    onPrimaryContainer = PrimaryGreenDark,
    secondary = SecondaryEarth,
    surface = SurfaceLight,
    onSurface = OnSurfaceLight,
    background = SurfaceLight,
    onBackground = OnSurfaceLight
)

private val DarkColors = darkColorScheme(
    primary = PrimaryGreenLight,
    onPrimary = PrimaryGreenDark,
    primaryContainer = PrimaryGreenDark,
    onPrimaryContainer = PrimaryGreenLight,
    secondary = SecondaryEarth,
    surface = SurfaceDark,
    onSurface = OnSurfaceDark,
    background = SurfaceDark,
    onBackground = OnSurfaceDark
)

@Composable
fun CadernimTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = CadernimTypography,
        content = content
    )
}
