import 'package:flutter/material.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/gym_session.dart';
import 'package:ascend/core/widgets/module_card.dart';

class WorkoutSummaryScreen extends StatelessWidget {
  final GymSession session;

  const WorkoutSummaryScreen({super.key, required this.session});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Group sets by exercise name
    final Map<String, List<GymSetLog>> exerciseGroups = {};
    for (final s in session.sets) {
      exerciseGroups.putIfAbsent(s.exerciseName, () => []).add(s);
    }

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
                  color: AppColors.gymCoral.withAlpha(isDark ? 40 : 25),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.emoji_events, color: AppColors.gymCoral, size: 44),
              ),
              const SizedBox(height: 18),
              Text(
                'Workout Smashed! 🔥',
                style: isDark ? AppTypography.headingLargeDark : AppTypography.headingLargeLight,
              ),
              const SizedBox(height: 4),
              Text(
                session.templateName,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.gymCoral),
              ),
              const SizedBox(height: 28),

              // Summary Stats Card
              ModuleCard(
                accentColor: AppColors.gymCoral,
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStat('TOTAL VOLUME', '${session.totalVolumeKg.round()} kg', isDark),
                        _buildStat('DURATION', '${session.durationMinutes} min', isDark),
                        _buildStat('PRS HIT', '${session.prsHit}', isDark, isHighlighted: session.prsHit > 0),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Calories Burned (est):', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        Text('${session.caloriesBurned.round()} kcal', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Breakdown of exercises
              Expanded(
                child: ListView.builder(
                  itemCount: exerciseGroups.length,
                  itemBuilder: (context, idx) {
                    final exName = exerciseGroups.keys.elementAt(idx);
                    final sets = exerciseGroups[exName]!;
                    final completedSets = sets.where((s) => s.isCompleted).length;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ModuleCard(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        child: Row(
                          children: [
                            Text('${idx + 1}.', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.gymCoral)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(exName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            ),
                            Text('$completedSets sets completed', style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gymCoral,
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

  Widget _buildStat(String label, String value, bool isDark, {bool isHighlighted = false}) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.1,
            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: isHighlighted ? AppColors.gymCoral : null,
          ),
        ),
      ],
    );
  }
}
