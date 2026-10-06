import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/activity.dart';
import 'package:ascend/core/models/exercise_log.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/exercise_mode/presentation/exercise_runner_screen.dart';
import 'package:ascend/features/today/state/today_providers.dart';

class TodayActivityTile extends ConsumerWidget {
  final TodayActivityItem item;

  const TodayActivityTile({
    super.key,
    required this.item,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activity = item.activity;

    Color categoryColor;
    switch (activity.category) {
      case ActivityCategory.posture:
      case ActivityCategory.mobility:
        categoryColor = AppColors.primaryTeal;
        break;
      case ActivityCategory.strength:
        categoryColor = AppColors.gymCoral;
        break;
      case ActivityCategory.cardio:
        categoryColor = AppColors.infoBlue;
        break;
      case ActivityCategory.custom:
        categoryColor = AppColors.nutritionAmber;
        break;
    }

    String subtitleText;
    if (activity.type == ActivityType.reps) {
      subtitleText = '${activity.defaultSets} × ${activity.defaultReps} reps • ${activity.targetArea}';
    } else if (activity.type == ActivityType.time) {
      final mins = activity.defaultDurationSeconds ~/ 60;
      final secs = activity.defaultDurationSeconds % 60;
      subtitleText = '${mins > 0 ? '$mins min ' : ''}${secs > 0 ? '$secs sec' : ''} • ${activity.targetArea}';
    } else {
      final mins = activity.defaultDurationSeconds ~/ 60;
      subtitleText = '$mins min cardio • ${activity.targetArea}';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: ModuleCard(
        accentColor: item.isCompleted ? AppColors.successMint : null,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ExerciseRunnerScreen(activity: activity),
            ),
          );
        },
        child: Row(
          children: [
            // Checkbox completion toggle
            IconButton(
              onPressed: () {
                if (item.isCompleted && item.log != null) {
                  ref.read(exerciseLogsProvider.notifier).deleteLog(item.log!.id);
                } else {
                  final newLog = ExerciseLog(
                    id: const Uuid().v4(),
                    activityId: activity.id,
                    activityTitle: activity.title,
                    category: activity.category.name,
                    timestamp: DateTime.now(),
                    setsCompleted: activity.defaultSets,
                    repsCompleted: activity.defaultReps,
                    durationSeconds: activity.defaultDurationSeconds,
                    caloriesBurned: 25.0,
                  );
                  ref.read(exerciseLogsProvider.notifier).addLog(newLog);
                }
              },
              icon: Icon(
                item.isCompleted ? Icons.check_circle : Icons.radio_button_unchecked,
                color: item.isCompleted
                    ? AppColors.successMint
                    : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                size: 26,
              ),
            ),
            const SizedBox(width: 4),
            // Activity Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activity.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      decoration: item.isCompleted ? TextDecoration.lineThrough : null,
                      color: item.isCompleted
                          ? (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)
                          : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitleText,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            // Start / Action badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: categoryColor.withAlpha(isDark ? 35 : 20),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    item.isCompleted ? Icons.replay : Icons.play_arrow,
                    size: 16,
                    color: categoryColor,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    item.isCompleted ? 'Redo' : 'Start',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: categoryColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
