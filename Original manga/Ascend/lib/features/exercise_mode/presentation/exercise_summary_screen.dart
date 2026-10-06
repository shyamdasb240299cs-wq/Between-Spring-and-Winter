import 'package:flutter/material.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/activity.dart';
import 'package:ascend/core/models/exercise_log.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/module_card.dart';

class ExerciseSummaryScreen extends StatelessWidget {
  final ExerciseLog log;
  final Activity activity;

  const ExerciseSummaryScreen({
    super.key,
    required this.log,
    required this.activity,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.successMint.withAlpha(isDark ? 40 : 25),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, color: AppColors.successMint, size: 48),
              ),
              const SizedBox(height: 20),
              Text(
                'Activity Completed!',
                style: isDark ? AppTypography.headingLargeDark : AppTypography.headingLargeLight,
              ),
              const SizedBox(height: 6),
              Text(
                activity.title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primaryTealLight,
                ),
              ),
              const SizedBox(height: 32),

              // Summary Stats Card
              ModuleCard(
                accentColor: AppColors.primaryTeal,
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStat('SETS', '${log.setsCompleted}', isDark),
                        if (log.repsCompleted > 0)
                          _buildStat('TOTAL REPS', '${log.repsCompleted}', isDark)
                        else if (log.durationSeconds > 0)
                          _buildStat('TIME', DateFormatters.formatDuration(log.durationSeconds), isDark),
                        _buildStat('EST. BURN', '${log.caloriesBurned.round()} kcal', isDark),
                      ],
                    ),
                    if (log.distanceKm > 0) ...[
                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 10),
                      Text(
                        'Distance: ${log.distanceKm.toStringAsFixed(2)} km',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ],
                ),
              ),
              const Spacer(),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryTeal,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value, bool isDark) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}
