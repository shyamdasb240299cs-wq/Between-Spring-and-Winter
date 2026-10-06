import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/database/hive_service.dart';
import '../../../core/models/activity.dart';
import '../../../core/models/routine.dart';

final activitiesProvider = StateNotifierProvider<ActivitiesNotifier, List<Activity>>((ref) {
  return ActivitiesNotifier();
});

class ActivitiesNotifier extends StateNotifier<List<Activity>> {
  ActivitiesNotifier() : super([]) {
    loadActivities();
  }

  void loadActivities() {
    final box = HiveService.instance.activitiesBox;
    final list = box.values.map((v) => Activity.fromMap(v)).toList();
    state = list;
  }

  Future<void> addOrUpdateActivity(Activity activity) async {
    await HiveService.instance.activitiesBox.put(activity.id, activity.toMap());
    loadActivities();
  }

  Future<void> deleteActivity(String id) async {
    await HiveService.instance.activitiesBox.delete(id);
    loadActivities();
  }
}

final routinesProvider = StateNotifierProvider<RoutinesNotifier, List<Routine>>((ref) {
  return RoutinesNotifier();
});

class RoutinesNotifier extends StateNotifier<List<Routine>> {
  RoutinesNotifier() : super([]) {
    loadRoutines();
  }

  void loadRoutines() {
    final box = HiveService.instance.routinesBox;
    final list = box.values.map((v) => Routine.fromMap(v)).toList();
    state = list;
  }

  Future<void> addOrUpdateRoutine(Routine routine) async {
    await HiveService.instance.routinesBox.put(routine.id, routine.toMap());
    loadRoutines();
  }

  Future<void> toggleRoutineEnabled(String id) async {
    final routine = state.firstWhere((r) => r.id == id);
    final updated = routine.copyWith(isEnabled: !routine.isEnabled);
    await addOrUpdateRoutine(updated);
  }

  Future<void> deleteRoutine(String id) async {
    await HiveService.instance.routinesBox.delete(id);
    loadRoutines();
  }
}
