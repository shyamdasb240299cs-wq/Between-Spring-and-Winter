import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/models/gym_session.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/core/widgets/rest_timer_dialog.dart';
import 'package:ascend/features/gym/presentation/widgets/exercise_animation_widget.dart';
import 'package:ascend/features/gym/state/gym_session_controller.dart';
import 'exercise_library_screen.dart';
import 'workout_summary_screen.dart';

class LiveWorkoutScreen extends ConsumerWidget {
  const LiveWorkoutScreen({super.key});

  void _showAddExerciseModal(BuildContext context, WidgetRef ref) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => GymExerciseLibraryScreen(
          isSelectionMode: true,
          onExerciseSelected: (selectedEx) {
            ref.read(liveGymSessionProvider.notifier).addExerciseToSession(selectedEx);
          },
        ),
      ),
    );
  }

  void _finishWorkout(BuildContext context, WidgetRef ref) async {
    final completedSession = await ref.read(liveGymSessionProvider.notifier).finishWorkout();
    if (completedSession != null && context.mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => WorkoutSummaryScreen(session: completedSession),
        ),
      );
    }
  }

  void _showExerciseFormGuide(BuildContext context, GymExercise ex) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black26,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      ex.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ExerciseAnimationWidget(exercise: ex, height: 200),
              const SizedBox(height: 14),
              const Text(
                'Technique & Mind-Muscle Cues:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.gymCoral),
              ),
              const SizedBox(height: 4),
              Text(
                ex.instructions.isNotEmpty
                    ? ex.instructions
                    : 'Control the eccentric descent, hold a brief stretch at the bottom, and drive smoothly through the concentric phase with active core bracing.',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final liveSessionState = ref.watch(liveGymSessionProvider);
    final session = liveSessionState.activeSession;

    if (session == null) {
      return Scaffold(
        appBar: const CustomAppBar(title: 'Workout Finished', accentColor: AppColors.gymCoral),
        body: Center(
          child: ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Back'),
          ),
        ),
      );
    }

    final totalVolume = session.sets.fold<double>(0.0, (acc, s) => acc + s.volume);
    final elapsedSecs = DateTime.now().difference(session.startTime).inSeconds;

    return Scaffold(
      appBar: CustomAppBar(
        title: session.templateName,
        subtitle: '${DateFormatters.formatDuration(elapsedSecs)} • ${totalVolume.round()} kg volume',
        accentColor: AppColors.gymCoral,
        actions: [
          TextButton(
            onPressed: () => _finishWorkout(context, ref),
            child: const Text(
              'FINISH',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.gymCoral),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: liveSessionState.selectedExercises.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.fitness_center, size: 48, color: AppColors.gymCoral),
                          const SizedBox(height: 12),
                          const Text('No exercises in workout yet', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.gymCoral),
                            onPressed: () => _showAddExerciseModal(context, ref),
                            icon: const Icon(Icons.add),
                            label: const Text('Add Exercise'),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: liveSessionState.selectedExercises.length,
                      itemBuilder: (context, exIndex) {
                        final ex = liveSessionState.selectedExercises[exIndex];
                        final exSets = session.sets.where((s) => s.exerciseId == ex.id).toList();
                        return _buildExerciseCard(context, ref, ex, exSets, isDark);
                      },
                    ),
            ),

            // Bottom Add Exercise Toolbar
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                border: Border(top: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.lightBorder)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _showAddExerciseModal(context, ref),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: AppColors.gymCoral),
                      ),
                      icon: const Icon(Icons.add, color: AppColors.gymCoral),
                      label: const Text('Add Exercise', style: TextStyle(color: AppColors.gymCoral, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton.filledTonal(
                    onPressed: () {
                      RestTimerDialog.show(context, initialSeconds: 90);
                    },
                    icon: const Icon(Icons.timer_outlined, color: AppColors.gymCoral),
                    tooltip: 'Rest Timer',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExerciseCard(
    BuildContext context,
    WidgetRef ref,
    GymExercise ex,
    List<GymSetLog> sets,
    bool isDark,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: ModuleCard(
        accentColor: AppColors.gymCoral,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Exercise Header + Form Animation Button + Remove
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ex.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${ex.primaryMuscle.displayName.toUpperCase()} • ${ex.equipment.displayName}',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.gymCoral),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.play_circle_outline_rounded, color: AppColors.gymCoral),
                  tooltip: 'Form & Motion Guide',
                  onPressed: () => _showExerciseFormGuide(context, ex),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 18, color: AppColors.darkTextMuted),
                  onPressed: () {
                    ref.read(liveGymSessionProvider.notifier).removeExercise(ex.id);
                  },
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Progressive Overload Cue Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.gymCoral.withAlpha(isDark ? 25 : 15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.trending_up, size: 16, color: AppColors.gymCoral),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      sets.isNotEmpty && sets.first.previousWeightKg != null
                          ? 'Target to beat: ${sets.first.previousWeightKg} kg × ${sets.first.previousReps} reps'
                          : 'Previous: Establish baseline with clean form',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.gymCoral),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Set Column Headers
            const Row(
              children: [
                SizedBox(width: 32, child: Text('SET', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold))),
                SizedBox(width: 8),
                SizedBox(width: 52, child: Text('PREV', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold))),
                SizedBox(width: 8),
                Expanded(child: Center(child: Text('KG', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)))),
                SizedBox(width: 8),
                Expanded(child: Center(child: Text('REPS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)))),
                SizedBox(width: 8),
                SizedBox(width: 40, child: Icon(Icons.check, size: 18)),
              ],
            ),
            const SizedBox(height: 6),

            // Set Rows
            ...sets.map((set) {
              return _buildSetRow(context, ref, set, isDark);
            }),

            const SizedBox(height: 10),
            // Add Set Button
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () {
                  ref.read(liveGymSessionProvider.notifier).addSetToExercise(ex.id);
                },
                icon: const Icon(Icons.add, size: 16, color: AppColors.gymCoral),
                label: const Text('+ Add Set', style: TextStyle(color: AppColors.gymCoral, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSetRow(
    BuildContext context,
    WidgetRef ref,
    GymSetLog set,
    bool isDark,
  ) {
    final prevText = (set.previousWeightKg != null && set.previousReps != null)
        ? '${set.previousWeightKg}x${set.previousReps}'
        : '-';

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: set.isCompleted
            ? AppColors.gymCoral.withAlpha(isDark ? 30 : 18)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          // Set Number
          SizedBox(
            width: 32,
            child: Center(
              child: Text(
                '${set.setNumber}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Previous text
          SizedBox(
            width: 52,
            child: Text(
              prevText,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Weight Input Field
          Expanded(
            child: Container(
              height: 38,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                borderRadius: BorderRadius.circular(8),
              ),
              child: TextFormField(
                initialValue: set.weightKg > 0 ? set.weightKg.toString() : '',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: '0',
                  contentPadding: EdgeInsets.zero,
                ),
                onChanged: (val) {
                  final w = double.tryParse(val) ?? 0.0;
                  ref.read(liveGymSessionProvider.notifier).updateSet(
                        set.id,
                        weight: w,
                      );
                },
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Reps Input Field
          Expanded(
            child: Container(
              height: 38,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                borderRadius: BorderRadius.circular(8),
              ),
              child: TextFormField(
                initialValue: set.reps > 0 ? set.reps.toString() : '',
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: '0',
                  contentPadding: EdgeInsets.zero,
                ),
                onChanged: (val) {
                  final r = int.tryParse(val) ?? 0;
                  ref.read(liveGymSessionProvider.notifier).updateSet(
                        set.id,
                        reps: r,
                      );
                },
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Checkmark Toggle Button
          IconButton(
            icon: Icon(
              set.isCompleted ? Icons.check_box : Icons.check_box_outline_blank,
              color: set.isCompleted ? AppColors.gymCoral : AppColors.darkTextMuted,
            ),
            onPressed: () {
              HapticFeedback.lightImpact();
              ref.read(liveGymSessionProvider.notifier).completeSet(
                    set.id,
                    !set.isCompleted,
                  );

              if (!set.isCompleted) {
                RestTimerDialog.show(context, initialSeconds: 75);
              }
            },
          ),
        ],
      ),
    );
  }
}
