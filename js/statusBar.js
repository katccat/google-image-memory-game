import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export function applyStatusBarTheme(isDark) {
	if (!Capacitor.isNativePlatform()) return;
	StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
}
