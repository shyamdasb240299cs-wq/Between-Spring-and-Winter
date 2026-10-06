import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/database/hive_service.dart';
import 'package:ascend/core/models/activity.dart';
import 'package:ascend/core/models/exercise_log.dart';
import 'package:ascend/core/models/routine.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/features/routines/state/routine_providers.dart';

class TodayActivityItem {
  final Activity activity;
  final Routine? routine;
  final TimeOfDayCategory timeOfDay;
  final bool isCompleted;
  final ExerciseLog? log;

  const TodayActivityItem({
    required this.activity,
    this.routine,
    required this.timeOfDay,
    this.isCompleted = false,
    this.log,
  });
}

final exerciseLogsProvider = StateNotifierProvider<ExerciseLogsNotifier, List<ExerciseLog>>((ref) {
  return ExerciseLogsNotifier();
});

class ExerciseLogsNotifier extends StateNotifier<List<ExerciseLog>> {
  ExerciseLogsNotifier() : super([]) {
    loadLogs();
  }

  void loadLogs() {
    final box = HiveService.instance.exerciseLogsBox;
    final list = box.values.map((v) => ExerciseLog.fromMap(v)).toList();
    list.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    state = list;
  }

  Future<void> addLog(ExerciseLog log) async {
    await HiveService.instance.exerciseLogsBox.put(log.id, log.toMap());
    loadLogs();
  }

  Future<void> deleteLog(String id) async {
    await HiveService.instance.exerciseLogsBox.delete(id);
    loadLogs();
  }
}

final todayPlanProvider = Provider<Map<TimeOfDayCategory, List<TodayActivityItem>>>((ref) {
  final routines = ref.watch(routinesProvider);
  final activities = ref.watch(activitiesProvider);
  final logs = ref.watch(exerciseLogsProvider);

  final now = DateTime.now();
  final currentWeekday = now.weekday; // 1 = Mon, 7 = Sun

  final Map<TimeOfDayCategory, List<TodayActivityItem>> grouped = {
    TimeOfDayCategory.morning: [],
    TimeOfDayCategory.afternoon: [],
    TimeOfDayCategory.evening: [],
    TimeOfDayCategory.night: [],
  };

  // Find logs completed today
  final todayLogs = logs.where((l) => DateFormatters.isSameDay(l.timestamp, now)).toList();

  final activeRoutines = routines.where((r) => r.isEnabled && r.isScheduledForDay(currentWeekday));

  for (final r in activeRoutines) {
    for (final actId in r.activityIds) {
      final act = activities.firstWhere(
        (a) => a.id == actId,
        orElse: () => Activity(
          id: actId,
          title: 'Custom Activity',
          description: '',
          type: ActivityType.reps,
          category: ActivityCategory.custom,
        ),
      );

      final matchingLog = todayLogs.where((l) => l.activityId == act.id).firstOrNull;

      grouped[r.timeOfDay]!.add(
        TodayActivityItem(
          activity: act,
          routine: r,
          timeOfDay: r.timeOfDay,
          isCompleted: matchingLog != null,
          log: matchingLog,
        ),
      );
    }
  }

  // If no routines are scheduled for today, provide default posture + walk recommendations
  if (grouped.values.every((list) => list.isEmpty)) {
    for (final act in activities) {
      final matchingLog = todayLogs.where((l) => l.activityId == act.id).firstOrNull;
      if (act.category == ActivityCategory.posture) {
        grouped[TimeOfDayCategory.evening]!.add(
          TodayActivityItem(
            activity: act,
            timeOfDay: TimeOfDayCategory.evening,
            isCompleted: matchingLog != null,
            log: matchingLog,
          ),
        );
      } else if (act.category == ActivityCategory.cardio) {
        grouped[TimeOfDayCategory.morning]!.add(
          TodayActivityItem(
            activity: act,
            timeOfDay: TimeOfDayCategory.morning,
            isCompleted: matchingLog != null,
            log: matchingLog,
          ),
        );
      }
    }
  }

  return grouped;
});

final currentStreakProvider = Provider<int>((ref) {
  final logs = ref.watch(exerciseLogsProvider);
  if (logs.isEmpty) return 1;

  final now = DateTime.now();
  int streak = 0;
  DateTime checkDay = DateTime(now.year, now.month, now.day);

  // Check if today has at least one log
  final hasToday = logs.any((l) => DateFormatters.isSameDay(l.timestamp, checkDay));
  if (hasToday) {
    streak++;
    checkDay = checkDay.subtract(const Duration(days: 1));
  } else {
    // Check if yesterday had a log
    final yesterday = checkDay.subtract(const Duration(days: 1));
    final hasYesterday = logs.any((l) => DateFormatters.isSameDay(l.timestamp, yesterday));
    if (!hasYesterday) return 0;
    streak++;
    checkDay = yesterday.subtract(const Duration(days: 1));
  }

  while (true) {
    final hasLog = logs.any((l) => DateFormatters.isSameDay(l.timestamp, checkDay));
    if (hasLog) {
      streak++;
      checkDay = checkDay.subtract(const Duration(days: 1));
    } else {
      break;
    }
  }

  return streak.clamp(1, 999);
});
