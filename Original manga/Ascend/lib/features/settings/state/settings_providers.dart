import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/database/database_keys.dart';
import '../../../core/database/hive_service.dart';
import '../../../core/models/user_profile.dart';

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.dark) {
    _loadTheme();
  }

  void _loadTheme() {
    final stored = HiveService.instance.settingsBox.get(DatabaseKeys.themeModeKey);
    if (stored == 'light') {
      state = ThemeMode.light;
    } else if (stored == 'dark') {
      state = ThemeMode.dark;
    } else {
      state = ThemeMode.dark; // Dark mode first default
    }
  }

  Future<void> toggleTheme() async {
    if (state == ThemeMode.dark) {
      state = ThemeMode.light;
      await HiveService.instance.settingsBox.put(DatabaseKeys.themeModeKey, 'light');
    } else {
      state = ThemeMode.dark;
      await HiveService.instance.settingsBox.put(DatabaseKeys.themeModeKey, 'dark');
    }
  }

  Future<void> setTheme(ThemeMode mode) async {
    state = mode;
    await HiveService.instance.settingsBox.put(
      DatabaseKeys.themeModeKey,
      mode == ThemeMode.light ? 'light' : 'dark',
    );
  }
}

final userProfileProvider = StateNotifierProvider<UserProfileNotifier, UserProfile>((ref) {
  return UserProfileNotifier();
});

class UserProfileNotifier extends StateNotifier<UserProfile> {
  UserProfileNotifier() : super(const UserProfile()) {
    loadProfile();
  }

  void loadProfile() {
    final map = HiveService.instance.userProfileBox.get(DatabaseKeys.userProfileKey);
    if (map != null) {
      state = UserProfile.fromMap(map);
    }
  }

  Future<void> updateProfile(UserProfile newProfile) async {
    state = newProfile;
    await HiveService.instance.userProfileBox.put(
      DatabaseKeys.userProfileKey,
      newProfile.toMap(),
    );
  }
}
