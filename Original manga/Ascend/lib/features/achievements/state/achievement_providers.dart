import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/database/hive_service.dart';
import '../../../core/models/achievement.dart';

final achievementsProvider = StateNotifierProvider<AchievementsNotifier, List<Achievement>>((ref) {
  return AchievementsNotifier();
});

class AchievementsNotifier extends StateNotifier<List<Achievement>> {
  AchievementsNotifier() : super([]) {
    loadAchievements();
  }

  void loadAchievements() {
    final box = HiveService.instance.achievementsBox;
    final list = box.values.map((v) => Achievement.fromMap(v)).toList();
    state = list;
  }

  Future<void> updateAchievement(Achievement achievement) async {
    await HiveService.instance.achievementsBox.put(achievement.id, achievement.toMap());
    loadAchievements();
  }
}
