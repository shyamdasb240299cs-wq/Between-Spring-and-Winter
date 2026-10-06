import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/database/hive_service.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/models/gym_session.dart';
import 'package:ascend/core/models/gym_workout_template.dart';
import 'package:ascend/core/utils/fitness_calculators.dart';

final gymExercisesProvider = StateNotifierProvider<GymExercisesNotifier, List<GymExercise>>((ref) {
  return GymExercisesNotifier();
});

class GymExercisesNotifier extends StateNotifier<List<GymExercise>> {
  GymExercisesNotifier() : super([]) {
    loadExercises();
  }

  void loadExercises() {
    final box = HiveService.instance.gymExercisesBox;
    final list = box.values.map((v) => GymExercise.fromMap(v)).toList();
    state = list;
  }

  Future<void> addExercise(GymExercise exercise) async {
    await HiveService.instance.gymExercisesBox.put(exercise.id, exercise.toMap());
    loadExercises();
  }
}

final gymTemplatesProvider = StateNotifierProvider<GymTemplatesNotifier, List<GymWorkoutTemplate>>((ref) {
  return GymTemplatesNotifier();
});

class GymTemplatesNotifier extends StateNotifier<List<GymWorkoutTemplate>> {
  GymTemplatesNotifier() : super([]) {
    loadTemplates();
  }

  void loadTemplates() {
    final box = HiveService.instance.gymTemplatesBox;
    final list = box.values.map((v) => GymWorkoutTemplate.fromMap(v)).toList();
    state = list;
  }

  Future<void> addOrUpdateTemplate(GymWorkoutTemplate template) async {
    await HiveService.instance.gymTemplatesBox.put(template.id, template.toMap());
    loadTemplates();
  }

  Future<void> deleteTemplate(String id) async {
    await HiveService.instance.gymTemplatesBox.delete(id);
    loadTemplates();
  }
}

final gymSessionsProvider = StateNotifierProvider<GymSessionsNotifier, List<GymSession>>((ref) {
  return GymSessionsNotifier();
});

class GymSessionsNotifier extends StateNotifier<List<GymSession>> {
  GymSessionsNotifier() : super([]) {
    loadSessions();
  }

  void loadSessions() {
    final box = HiveService.instance.gymSessionsBox;
    final list = box.values.map((v) => GymSession.fromMap(v)).toList();
    list.sort((a, b) => b.startTime.compareTo(a.startTime));
    state = list;
  }

  Future<void> saveSession(GymSession session) async {
    await HiveService.instance.gymSessionsBox.put(session.id, session.toMap());
    loadSessions();
  }

  Future<void> deleteSession(String id) async {
    await HiveService.instance.gymSessionsBox.delete(id);
    loadSessions();
  }
}

/// Helper provider to get the last recorded performance for an exercise
final lastExercisePerformanceProvider = Provider.family<List<GymSetLog>, String>((ref, exerciseId) {
  final sessions = ref.watch(gymSessionsProvider);
  for (final s in sessions) {
    final setsForEx = s.sets.where((st) => st.exerciseId == exerciseId && st.isCompleted).toList();
    if (setsForEx.isNotEmpty) {
      return setsForEx;
    }
  }
  return [];
});

class ExercisePRData {
  final double maxWeight;
  final double max1RM;
  final int maxReps;

  const ExercisePRData({
    required this.maxWeight,
    required this.max1RM,
    required this.maxReps,
  });
}

/// Best PR (heaviest weight & estimated 1RM) for a given exercise
final exercisePRProvider = Provider.family<ExercisePRData, String>((ref, exerciseId) {
  final sessions = ref.watch(gymSessionsProvider);
  double maxWeight = 0.0;
  double max1RM = 0.0;
  int maxReps = 0;

  for (final s in sessions) {
    for (final st in s.sets) {
      if (st.exerciseId == exerciseId && st.isCompleted) {
        if (st.weightKg > maxWeight) maxWeight = st.weightKg;
        if (st.reps > maxReps) maxReps = st.reps;
        final oneRM = FitnessCalculators.calculate1RM(st.weightKg, st.reps);
        if (oneRM > max1RM) max1RM = oneRM;
      }
    }
  }

  return ExercisePRData(maxWeight: maxWeight, max1RM: max1RM, maxReps: maxReps);
});

class WeeklyVolumePoint {
  final String label;
  final double totalVolumeKg;

  const WeeklyVolumePoint({required this.label, required this.totalVolumeKg});
}

final weeklyVolumeStatsProvider = Provider<List<WeeklyVolumePoint>>((ref) {
  final sessions = ref.watch(gymSessionsProvider);
  final now = DateTime.now();

  final List<WeeklyVolumePoint> points = [];

  for (int i = 3; i >= 0; i--) {
    final weekStart = now.subtract(Duration(days: (i + 1) * 7));
    final weekEnd = now.subtract(Duration(days: i * 7));

    double weekVolume = 0.0;
    for (final s in sessions) {
      if (s.startTime.isAfter(weekStart) && s.startTime.isBefore(weekEnd.add(const Duration(days: 1)))) {
        weekVolume += s.totalVolumeKg;
      }
    }

    final label = i == 0 ? 'This Wk' : 'Wk -$i';
    points.add(WeeklyVolumePoint(label: label, totalVolumeKg: weekVolume));
  }

  return points;
});
