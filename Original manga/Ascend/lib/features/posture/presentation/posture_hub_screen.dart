import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/activity.dart';
import 'package:ascend/core/models/posture_checkin.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/exercise_mode/presentation/exercise_runner_screen.dart';
import 'package:ascend/features/routines/state/routine_providers.dart';
import 'package:ascend/features/posture/state/posture_providers.dart';

class PostureHubScreen extends ConsumerStatefulWidget {
  const PostureHubScreen({super.key});

  @override
  ConsumerState<PostureHubScreen> createState() => _PostureHubScreenState();
}

class _PostureHubScreenState extends ConsumerState<PostureHubScreen> {
  int _breakIntervalMinutes = 45;
  bool _isNudgeActive = true;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final checkins = ref.watch(postureCheckinsProvider);
    final activities = ref.watch(activitiesProvider);

    final postureActivities = activities.where((a) => a.category == ActivityCategory.posture || a.category == ActivityCategory.mobility).toList();

    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Posture & Mobility Hub',
        subtitle: 'Cervical alignment & desk relief',
        accentColor: AppColors.primaryTeal,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Smart Sitting Break Nudge Timer Card
              ModuleCard(
                accentColor: AppColors.primaryTeal,
                padding: const EdgeInsets.all(18),
                hasGlow: true,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.timer_outlined, color: AppColors.primaryTeal, size: 22),
                            const SizedBox(width: 8),
                            const Text(
                              'Smart Sitting Break Nudge',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primaryTeal),
                            ),
                          ],
                        ),
                        Switch(
                          value: _isNudgeActive,
                          activeThumbColor: AppColors.primaryTeal,
                          onChanged: (v) => setState(() => _isNudgeActive = v),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Periodic reminder: "You\'ve been sitting for a while. Stand up and reset spine alignment."',
                      style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Text('Reminder interval:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        const Spacer(),
                        DropdownButton<int>(
                          value: _breakIntervalMinutes,
                          underline: const SizedBox(),
                          items: [30, 45, 60, 90].map((m) {
                            return DropdownMenuItem(value: m, child: Text('Every $m mins'));
                          }).toList(),
                          onChanged: _isNudgeActive ? (v) => setState(() => _breakIntervalMinutes = v!) : null,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Posture Check-in Log Actions
              Text(
                'Record Current Posture Check-in',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),

              Row(
                children: PostureRating.values.map((rating) {
                  return Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: rating != PostureRating.poor ? 8 : 0),
                      child: InkWell(
                        onTap: () {
                          final newCheckin = PostureCheckin(
                            id: const Uuid().v4(),
                            timestamp: DateTime.now(),
                            rating: rating,
                            note: 'Logged in Posture Hub',
                          );
                          ref.read(postureCheckinsProvider.notifier).addCheckin(newCheckin);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Logged posture rating: ${rating.displayName} ${rating.emoji}'),
                              duration: const Duration(seconds: 1),
                            ),
                          );
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                          child: Column(
                            children: [
                              Text(rating.emoji, style: const TextStyle(fontSize: 26)),
                              const SizedBox(height: 4),
                              Text(
                                rating.displayName,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Posture Exercises Quick Launcher
              Text(
                'Corrective Mobility Movements',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),

              ...postureActivities.map((act) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ModuleCard(
                    accentColor: AppColors.primaryTeal,
                    padding: const EdgeInsets.all(14),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => ExerciseRunnerScreen(activity: act)),
                      );
                    },
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.primaryTeal.withAlpha(isDark ? 35 : 20),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.accessibility_new, color: AppColors.primaryTeal, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(act.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 2),
                              Text(
                                '${act.targetArea} • ${act.description}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.play_circle_fill, color: AppColors.primaryTeal, size: 28),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 20),

              // Check-in History
              Text(
                'Recent Check-in Logs',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 8),

              if (checkins.isEmpty)
                Text(
                  'No check-ins logged yet.',
                  style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                )
              else
                ...checkins.take(5).map((c) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    child: ModuleCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Row(
                        children: [
                          Text(c.rating.emoji, style: const TextStyle(fontSize: 20)),
                          const SizedBox(width: 10),
                          Text(
                            c.rating.displayName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          const Spacer(),
                          Text(
                            DateFormatters.formatTime(c.timestamp),
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
