import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/features/gym/state/gym_history_providers.dart';
import 'package:ascend/features/nutrition/state/nutrition_providers.dart';
import 'package:ascend/features/progress/state/progress_providers.dart';
import 'package:ascend/features/settings/state/settings_providers.dart';
import 'package:ascend/features/today/state/today_providers.dart';

enum DayActivityState {
  completed, // Mint Green
  partial, // Amber Yellow
  missed, // Soft Red
  restDay; // Slate/Dim
}

class WeeklyHealthReportData {
  final int postureCompletedDays;
  final int gymSessionCount;
  final double totalGymVolumeKg;
  final int prsHit;
  final double totalRunningDistanceKm;
  final double avgDailyCalories;
  final double calorieAdherencePercent;
  final double startWeightKg;
  final double currentWeightKg;
  final int consistencyScorePercent;

  const WeeklyHealthReportData({
    required this.postureCompletedDays,
    required this.gymSessionCount,
    required this.totalGymVolumeKg,
    required this.prsHit,
    required this.totalRunningDistanceKm,
    required this.avgDailyCalories,
    required this.calorieAdherencePercent,
    required this.startWeightKg,
    required this.currentWeightKg,
    required this.consistencyScorePercent,
  });
}

final weeklyHealthReportProvider = Provider<WeeklyHealthReportData>((ref) {
  final exerciseLogs = ref.watch(exerciseLogsProvider);
  final gymSessions = ref.watch(gymSessionsProvider);
  final nutritionEntries = ref.watch(nutritionEntriesProvider);
  final profile = ref.watch(userProfileProvider);
  final bodyMetrics = ref.watch(bodyMetricsProvider);

  final now = DateTime.now();
  final sevenDaysAgo = now.subtract(const Duration(days: 7));

  // 1. Posture completed days
  final weekExerciseLogs = exerciseLogs.where((l) => l.timestamp.isAfter(sevenDaysAgo)).toList();
  final postureDays = <String>{};
  for (final l in weekExerciseLogs) {
    if (l.category == 'posture' || l.category == 'mobility') {
      postureDays.add(DateFormatters.toIsoDate(l.timestamp));
    }
  }

  // 2. Gym sessions & volume
  final weekGymSessions = gymSessions.where((s) => s.startTime.isAfter(sevenDaysAgo)).toList();
  double gymVolume = 0.0;
  int prs = 0;
  for (final s in weekGymSessions) {
    gymVolume += s.totalVolumeKg;
    prs += s.prsHit;
  }

  // 3. Running distance
  double runningKm = 0.0;
  for (final l in weekExerciseLogs) {
    if (l.category == 'cardio') {
      runningKm += l.distanceKm;
    }
  }

  // 4. Nutrition adherence
  final weekMeals = nutritionEntries.where((m) => m.timestamp.isAfter(sevenDaysAgo)).toList();
  final Map<String, double> dailyCalorieMap = {};
  for (final m in weekMeals) {
    final day = DateFormatters.toIsoDate(m.timestamp);
    dailyCalorieMap[day] = (dailyCalorieMap[day] ?? 0.0) + m.calories;
  }

  double totalCals = 0.0;
  int adheredDays = 0;
  for (final cals in dailyCalorieMap.values) {
    totalCals += cals;
    // Adherence: within 15% of target
    if ((cals - profile.targetCalories).abs() <= (profile.targetCalories * 0.15)) {
      adheredDays++;
    }
  }
  final avgCalories = dailyCalorieMap.isNotEmpty ? (totalCals / dailyCalorieMap.length) : profile.targetCalories;
  final adherencePercent = dailyCalorieMap.isNotEmpty ? ((adheredDays / dailyCalorieMap.length) * 100).clamp(0.0, 100.0) : 100.0;

  // 5. Weight change
  double startWeight = profile.weightKg;
  double currentWeight = profile.weightKg;
  if (bodyMetrics.isNotEmpty) {
    currentWeight = bodyMetrics.last.weightKg;
    final weekStartMetric = bodyMetrics.where((m) => m.date.isBefore(sevenDaysAgo)).lastOrNull;
    if (weekStartMetric != null) {
      startWeight = weekStartMetric.weightKg;
    } else {
      startWeight = bodyMetrics.first.weightKg;
    }
  }

  // 6. Consistency Score
  final postureScore = (postureDays.length / 7.0) * 40.0;
  final gymScore = (weekGymSessions.length / 4.0).clamp(0.0, 1.0) * 30.0;
  final nutritionScore = (adherencePercent / 100.0) * 30.0;
  final consistencyScore = (postureScore + gymScore + nutritionScore).round().clamp(10, 100);

  return WeeklyHealthReportData(
    postureCompletedDays: postureDays.length.clamp(0, 7),
    gymSessionCount: weekGymSessions.length,
    totalGymVolumeKg: gymVolume,
    prsHit: prs,
    totalRunningDistanceKm: runningKm,
    avgDailyCalories: avgCalories,
    calorieAdherencePercent: adherencePercent,
    startWeightKg: startWeight,
    currentWeightKg: currentWeight,
    consistencyScorePercent: consistencyScore,
  );
});

class HeatmapDayInfo {
  final DateTime date;
  final DayActivityState state;
  final int completedCount;

  const HeatmapDayInfo({
    required this.date,
    required this.state,
    required this.completedCount,
  });
}

final calendarHeatmapProvider = Provider<List<HeatmapDayInfo>>((ref) {
  final exerciseLogs = ref.watch(exerciseLogsProvider);
  final gymSessions = ref.watch(gymSessionsProvider);

  final now = DateTime.now();
  final List<HeatmapDayInfo> days = [];

  // Generate for past 28 days
  for (int i = 27; i >= 0; i--) {
    final checkDate = DateTime(now.year, now.month, now.day).subtract(Duration(days: i));
    final checkDateStr = DateFormatters.toIsoDate(checkDate);

    final dayExerciseLogs = exerciseLogs.where((l) => DateFormatters.toIsoDate(l.timestamp) == checkDateStr).length;
    final dayGymSessions = gymSessions.where((s) => DateFormatters.toIsoDate(s.startTime) == checkDateStr).length;
    final totalActivity = dayExerciseLogs + dayGymSessions;

    DayActivityState state;
    if (totalActivity >= 2) {
      state = DayActivityState.completed;
    } else if (totalActivity == 1) {
      state = DayActivityState.partial;
    } else {
      if (checkDate.weekday == DateTime.sunday) {
        state = DayActivityState.restDay;
      } else if (checkDate.isBefore(DateTime(now.year, now.month, now.day))) {
        state = DayActivityState.missed;
      } else {
        state = DayActivityState.restDay;
      }
    }

    days.add(
      HeatmapDayInfo(
        date: checkDate,
        state: state,
        completedCount: totalActivity,
      ),
    );
  }

  return days;
});
