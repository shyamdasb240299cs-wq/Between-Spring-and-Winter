import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/database/hive_service.dart';
import 'package:ascend/core/models/nutrition_entry.dart';
import 'package:ascend/core/models/water_entry.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/features/gym/state/gym_history_providers.dart';
import 'package:ascend/features/settings/state/settings_providers.dart';
import 'package:ascend/features/today/state/today_providers.dart';

final nutritionEntriesProvider = StateNotifierProvider<NutritionEntriesNotifier, List<NutritionEntry>>((ref) {
  return NutritionEntriesNotifier();
});

class NutritionEntriesNotifier extends StateNotifier<List<NutritionEntry>> {
  NutritionEntriesNotifier() : super([]) {
    loadEntries();
  }

  void loadEntries() {
    final box = HiveService.instance.nutritionEntriesBox;
    final list = box.values.map((v) => NutritionEntry.fromMap(v)).toList();
    list.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    state = list;
  }

  Future<void> addEntry(NutritionEntry entry) async {
    await HiveService.instance.nutritionEntriesBox.put(entry.id, entry.toMap());
    loadEntries();
  }

  Future<void> toggleFavorite(String id) async {
    final entry = state.firstWhere((e) => e.id == id);
    final updated = entry.copyWith(isFavorite: !entry.isFavorite);
    await addEntry(updated);
  }

  Future<void> deleteEntry(String id) async {
    await HiveService.instance.nutritionEntriesBox.delete(id);
    loadEntries();
  }
}

final waterEntriesProvider = StateNotifierProvider<WaterEntriesNotifier, List<WaterEntry>>((ref) {
  return WaterEntriesNotifier();
});

class WaterEntriesNotifier extends StateNotifier<List<WaterEntry>> {
  WaterEntriesNotifier() : super([]) {
    loadWater();
  }

  void loadWater() {
    final box = HiveService.instance.waterLogsBox;
    final list = box.values.map((v) => WaterEntry.fromMap(v)).toList();
    state = list;
  }

  Future<void> addWater(int amountMl) async {
    const uuid = Uuid();
    final todayStr = DateFormatters.toIsoDate(DateTime.now());
    final existingIndex = state.indexWhere((w) => w.dateString == todayStr);

    if (existingIndex != -1) {
      final existing = state[existingIndex];
      final updated = WaterEntry(
        id: existing.id,
        dateString: todayStr,
        amountMl: existing.amountMl + amountMl,
        timestamp: DateTime.now(),
      );
      await HiveService.instance.waterLogsBox.put(updated.id, updated.toMap());
    } else {
      final newEntry = WaterEntry(
        id: uuid.v4(),
        dateString: todayStr,
        amountMl: amountMl,
        timestamp: DateTime.now(),
      );
      await HiveService.instance.waterLogsBox.put(newEntry.id, newEntry.toMap());
    }
    loadWater();
  }
}

class DailyNutritionSummary {
  final double totalCalories;
  final double totalProteinGrams;
  final double totalCarbsGrams;
  final double totalFatGrams;
  final double targetCalories;
  final double caloriesBurned;
  final double netBalance; // Consumed - (BMR + Exercise Burned)
  final int waterConsumedMl;
  final int waterGoalMl;
  final List<NutritionEntry> todayMeals;

  const DailyNutritionSummary({
    required this.totalCalories,
    required this.totalProteinGrams,
    required this.totalCarbsGrams,
    required this.totalFatGrams,
    required this.targetCalories,
    required this.caloriesBurned,
    required this.netBalance,
    required this.waterConsumedMl,
    required this.waterGoalMl,
    required this.todayMeals,
  });
}

final dailyNutritionSummaryProvider = Provider<DailyNutritionSummary>((ref) {
  final allEntries = ref.watch(nutritionEntriesProvider);
  final profile = ref.watch(userProfileProvider);
  final exerciseLogs = ref.watch(exerciseLogsProvider);
  final gymSessions = ref.watch(gymSessionsProvider);
  final waterLogs = ref.watch(waterEntriesProvider);

  final now = DateTime.now();
  final todayStr = DateFormatters.toIsoDate(now);

  final todayMeals = allEntries.where((e) => DateFormatters.isSameDay(e.timestamp, now)).toList();

  double calories = 0.0;
  double protein = 0.0;
  double carbs = 0.0;
  double fat = 0.0;

  for (final m in todayMeals) {
    calories += m.calories;
    protein += m.proteinGrams;
    carbs += m.carbsGrams;
    fat += m.fatGrams;
  }

  // Calculate today's exercise calories burned
  double exerciseBurned = 0.0;
  final todayExLogs = exerciseLogs.where((l) => DateFormatters.isSameDay(l.timestamp, now));
  for (final l in todayExLogs) {
    exerciseBurned += l.caloriesBurned;
  }

  final todayGymSessions = gymSessions.where((s) => DateFormatters.isSameDay(s.startTime, now));
  for (final s in todayGymSessions) {
    exerciseBurned += s.caloriesBurned;
  }

  final totalBurned = profile.bmr + exerciseBurned;
  final netBalance = calories - totalBurned;

  final todayWater = waterLogs.where((w) => w.dateString == todayStr).firstOrNull?.amountMl ?? 0;

  return DailyNutritionSummary(
    totalCalories: calories,
    totalProteinGrams: protein,
    totalCarbsGrams: carbs,
    totalFatGrams: fat,
    targetCalories: profile.targetCalories,
    caloriesBurned: totalBurned,
    netBalance: netBalance,
    waterConsumedMl: todayWater,
    waterGoalMl: profile.waterGoalMl,
    todayMeals: todayMeals,
  );
});
