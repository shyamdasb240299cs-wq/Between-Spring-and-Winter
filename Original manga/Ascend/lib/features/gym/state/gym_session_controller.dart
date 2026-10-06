import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/models/gym_session.dart';
import 'package:ascend/core/models/gym_workout_template.dart';
import 'package:ascend/core/utils/fitness_calculators.dart';
import 'gym_history_providers.dart';

class GymSessionState {
  final GymSession? activeSession;
  final List<GymExercise> selectedExercises;
  final bool isRestTimerActive;
  final int restTimerSeconds;
  final GymSetLog? lastCompletedSet;
  final bool justHitPR;
  final String prCelebrationMessage;

  const GymSessionState({
    this.activeSession,
    this.selectedExercises = const [],
    this.isRestTimerActive = false,
    this.restTimerSeconds = 90,
    this.lastCompletedSet,
    this.justHitPR = false,
    this.prCelebrationMessage = '',
  });

  bool get isWorkoutInProgress => activeSession != null;

  GymSessionState copyWith({
    GymSession? activeSession,
    List<GymExercise>? selectedExercises,
    bool? isRestTimerActive,
    int? restTimerSeconds,
    GymSetLog? lastCompletedSet,
    bool? justHitPR,
    String? prCelebrationMessage,
  }) {
    return GymSessionState(
      activeSession: activeSession ?? this.activeSession,
      selectedExercises: selectedExercises ?? this.selectedExercises,
      isRestTimerActive: isRestTimerActive ?? this.isRestTimerActive,
      restTimerSeconds: restTimerSeconds ?? this.restTimerSeconds,
      lastCompletedSet: lastCompletedSet ?? this.lastCompletedSet,
      justHitPR: justHitPR ?? this.justHitPR,
      prCelebrationMessage: prCelebrationMessage ?? this.prCelebrationMessage,
    );
  }
}

final liveGymSessionProvider = StateNotifierProvider<GymSessionController, GymSessionState>((ref) {
  return GymSessionController(ref);
});

class GymSessionController extends StateNotifier<GymSessionState> {
  final Ref ref;
  final Uuid _uuid = const Uuid();

  GymSessionController(this.ref) : super(const GymSessionState());

  void startWorkoutFromTemplate(GymWorkoutTemplate template, [List<GymExercise>? allEx]) {
    final List<GymExercise> allExercises = allEx ?? ref.read(gymExercisesProvider);
    final selected = allExercises.where((e) => template.exerciseIds.contains(e.id)).toList();

    final List<GymSetLog> initialSets = [];
    for (final ex in selected) {
      final lastLogs = ref.read(lastExercisePerformanceProvider(ex.id));
      for (int i = 1; i <= ex.defaultSets; i++) {
        final prevSet = lastLogs.length >= i ? lastLogs[i - 1] : null;
        initialSets.add(
          GymSetLog(
            id: _uuid.v4(),
            exerciseId: ex.id,
            exerciseName: ex.name,
            setNumber: i,
            weightKg: prevSet?.weightKg ?? ex.defaultWeightKg,
            reps: prevSet?.reps ?? ex.defaultReps,
            setType: GymSetType.working,
            previousWeightKg: prevSet?.weightKg,
            previousReps: prevSet?.reps,
          ),
        );
      }
    }

    final newSession = GymSession(
      id: _uuid.v4(),
      templateId: template.id,
      templateName: template.name,
      startTime: DateTime.now(),
      sets: initialSets,
    );

    state = state.copyWith(
      activeSession: newSession,
      selectedExercises: selected,
      justHitPR: false,
    );
  }

  void startCustomWorkout({String name = 'Custom Workout'}) {
    final newSession = GymSession(
      id: _uuid.v4(),
      templateName: name,
      startTime: DateTime.now(),
      sets: [],
    );

    state = state.copyWith(
      activeSession: newSession,
      selectedExercises: [],
      justHitPR: false,
    );
  }

  void addExerciseToSession(GymExercise exercise) {
    if (state.activeSession == null) return;
    if (state.selectedExercises.any((e) => e.id == exercise.id)) return;

    final updatedExercises = [...state.selectedExercises, exercise];
    final lastLogs = ref.read(lastExercisePerformanceProvider(exercise.id));
    final List<GymSetLog> newSets = [];

    for (int i = 1; i <= exercise.defaultSets; i++) {
      final prevSet = lastLogs.length >= i ? lastLogs[i - 1] : null;
      newSets.add(
        GymSetLog(
          id: _uuid.v4(),
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          setNumber: i,
          weightKg: prevSet?.weightKg ?? exercise.defaultWeightKg,
          reps: prevSet?.reps ?? exercise.defaultReps,
          setType: GymSetType.working,
          previousWeightKg: prevSet?.weightKg,
          previousReps: prevSet?.reps,
        ),
      );
    }

    final updatedSession = state.activeSession!.copyWith(
      sets: [...state.activeSession!.sets, ...newSets],
    );

    state = state.copyWith(
      activeSession: updatedSession,
      selectedExercises: updatedExercises,
    );
  }

  void removeExercise(String exerciseId) {
    if (state.activeSession == null) return;
    final updatedExercises = state.selectedExercises.where((e) => e.id != exerciseId).toList();
    final updatedSets = state.activeSession!.sets.where((s) => s.exerciseId != exerciseId).toList();

    state = state.copyWith(
      selectedExercises: updatedExercises,
      activeSession: state.activeSession!.copyWith(sets: updatedSets),
    );
  }

  void updateSet(String setId, {double? weight, int? reps, GymSetType? setType}) {
    if (state.activeSession == null) return;

    final updatedSets = state.activeSession!.sets.map((s) {
      if (s.id == setId) {
        return s.copyWith(
          weightKg: weight ?? s.weightKg,
          reps: reps ?? s.reps,
          setType: setType ?? s.setType,
        );
      }
      return s;
    }).toList();

    state = state.copyWith(
      activeSession: state.activeSession!.copyWith(sets: updatedSets),
    );
  }

  void addSetToExercise(String exerciseId) {
    if (state.activeSession == null) return;
    final exerciseSets = state.activeSession!.sets.where((s) => s.exerciseId == exerciseId).toList();
    final exercise = state.selectedExercises.firstWhere((e) => e.id == exerciseId);

    final nextNumber = exerciseSets.length + 1;
    final lastSet = exerciseSets.isNotEmpty ? exerciseSets.last : null;

    final newSet = GymSetLog(
      id: _uuid.v4(),
      exerciseId: exerciseId,
      exerciseName: exercise.name,
      setNumber: nextNumber,
      weightKg: lastSet?.weightKg ?? exercise.defaultWeightKg,
      reps: lastSet?.reps ?? exercise.defaultReps,
      setType: GymSetType.working,
      previousWeightKg: lastSet?.previousWeightKg,
      previousReps: lastSet?.previousReps,
    );

    state = state.copyWith(
      activeSession: state.activeSession!.copyWith(
        sets: [...state.activeSession!.sets, newSet],
      ),
    );
  }

  void removeSet(String setId) {
    if (state.activeSession == null) return;
    final updatedSets = state.activeSession!.sets.where((s) => s.id != setId).toList();
    state = state.copyWith(
      activeSession: state.activeSession!.copyWith(sets: updatedSets),
    );
  }

  /// Mark set as complete, check PR condition, trigger rest timer
  void completeSet(String setId, bool isCompleted) {
    if (state.activeSession == null) return;

    bool isPRHit = false;
    String prMessage = '';
    GymSetLog? justCompleted;

    final updatedSets = state.activeSession!.sets.map((s) {
      if (s.id == setId) {
        if (isCompleted) {
          // Check PR
          final prStats = ref.read(exercisePRProvider(s.exerciseId));
          final current1RM = FitnessCalculators.calculate1RM(s.weightKg, s.reps);

          if (prStats.maxWeight > 0 && s.weightKg > prStats.maxWeight) {
            isPRHit = true;
            prMessage = '🎉 New Heaviest Weight PR! ${s.weightKg} kg on ${s.exerciseName}!';
          } else if (prStats.max1RM > 0 && current1RM > prStats.max1RM) {
            isPRHit = true;
            prMessage = '🔥 New Estimated 1RM PR! ${current1RM.toStringAsFixed(1)} kg on ${s.exerciseName}!';
          }

          justCompleted = s.copyWith(isCompleted: true, isPR: isPRHit);
          return justCompleted!;
        }
        return s.copyWith(isCompleted: false, isPR: false);
      }
      return s;
    }).toList();

    int totalPRs = updatedSets.where((s) => s.isPR).length;

    state = state.copyWith(
      activeSession: state.activeSession!.copyWith(
        sets: updatedSets,
        prsHit: totalPRs,
      ),
      lastCompletedSet: justCompleted,
      justHitPR: isPRHit,
      prCelebrationMessage: prMessage,
      isRestTimerActive: isCompleted,
    );
  }

  void dismissPRCelebration() {
    state = state.copyWith(justHitPR: false, prCelebrationMessage: '');
  }

  Future<GymSession?> finishWorkout({String notes = ''}) async {
    if (state.activeSession == null) return null;

    final endTime = DateTime.now();
    final completedSets = state.activeSession!.sets.where((s) => s.isCompleted).toList();
    final totalVolume = FitnessCalculators.calculateTotalVolume(completedSets);
    final durationMins = endTime.difference(state.activeSession!.startTime).inMinutes.clamp(1, 400);
    final calories = FitnessCalculators.calculateGymCalories(
      durationMinutes: durationMins,
      totalVolumeKg: totalVolume,
    );

    final finalSession = state.activeSession!.copyWith(
      endTime: endTime,
      totalVolumeKg: totalVolume,
      caloriesBurned: calories,
      notes: notes,
    );

    // Persist session to Hive
    await ref.read(gymSessionsProvider.notifier).saveSession(finalSession);

    // Reset active session state
    state = const GymSessionState();

    return finalSession;
  }

  void cancelWorkout() {
    state = const GymSessionState();
  }
}
