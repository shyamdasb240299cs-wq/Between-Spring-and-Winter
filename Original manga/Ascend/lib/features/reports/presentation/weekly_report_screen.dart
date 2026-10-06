import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/achievements/presentation/achievements_screen.dart';
import 'package:ascend/features/notes/presentation/journal_screen.dart';
import 'package:ascend/features/posture/presentation/posture_hub_screen.dart';
import 'package:ascend/features/settings/presentation/settings_screen.dart';
import 'package:ascend/features/reports/state/report_providers.dart';
import 'activity_heatmap_screen.dart';

class WeeklyReportScreen extends ConsumerWidget {
  const WeeklyReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final report = ref.watch(weeklyHealthReportProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Weekly Health Report',
        subtitle: 'Did you make progress this week?',
        accentColor: AppColors.successMint,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Settings',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Consistency Score Card
              ModuleCard(
                accentColor: AppColors.successMint,
                padding: const EdgeInsets.all(20),
                hasGlow: true,
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'WEEKLY DISCIPLINE SCORE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.successMint,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${report.consistencyScorePercent}%',
                            style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            report.consistencyScorePercent >= 80
                                ? 'Outstanding adherence across all 4 pillars! 🚀'
                                : 'Solid effort! Focus on completing posture daily.',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.successMint.withAlpha(isDark ? 40 : 25),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.verified, size: 36, color: AppColors.successMint),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // 6 Pillar Breakdown Cards
              Text(
                'Your Week at a Glance',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),

              _buildPillarReportTile(
                icon: Icons.accessibility_new,
                color: AppColors.primaryTeal,
                pillar: 'Posture & Mobility',
                value: '${report.postureCompletedDays} / 7 days completed',
                detail: 'Countering desk slump & anterior pelvic tilt',
                isDark: isDark,
              ),
              const SizedBox(height: 10),

              _buildPillarReportTile(
                icon: Icons.fitness_center,
                color: AppColors.gymCoral,
                pillar: 'Gym & Strength',
                value: '${report.gymSessionCount} sessions • ${report.totalGymVolumeKg.round()} kg volume • ${report.prsHit} PRs',
                detail: 'Progressive overload tracking',
                isDark: isDark,
              ),
              const SizedBox(height: 10),

              _buildPillarReportTile(
                icon: Icons.directions_run,
                color: AppColors.infoBlue,
                pillar: 'Cardio & Stamina',
                value: '${report.totalRunningDistanceKm.toStringAsFixed(1)} km completed',
                detail: 'Aerobic endurance & fat oxidation',
                isDark: isDark,
              ),
              const SizedBox(height: 10),

              _buildPillarReportTile(
                icon: Icons.restaurant_menu,
                color: AppColors.nutritionAmber,
                pillar: 'Nutrition Adherence',
                value: 'Avg ${report.avgDailyCalories.round()} kcal/day • ${report.calorieAdherencePercent.round()}% adherence',
                detail: 'TDEE target alignment',
                isDark: isDark,
              ),
              const SizedBox(height: 10),

              _buildPillarReportTile(
                icon: Icons.show_chart,
                color: AppColors.progressIndigo,
                pillar: 'Body Weight Trend',
                value: '${report.startWeightKg} → ${report.currentWeightKg} kg',
                detail: 'Long-term composition trajectory',
                isDark: isDark,
              ),
              const SizedBox(height: 24),

              // Quick Hub Navigation Links
              Text(
                'More Tools & Reflection',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),

              // Heatmap tile
              _buildNavCard(
                icon: Icons.calendar_month,
                color: AppColors.successMint,
                title: 'Activity Calendar Heatmap',
                subtitle: 'View your 28-day discipline grid',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ActivityHeatmapScreen()),
                  );
                },
                isDark: isDark,
              ),
              const SizedBox(height: 10),

              // Posture Hub
              _buildNavCard(
                icon: Icons.spa,
                color: AppColors.primaryTeal,
                title: 'Posture Hub & Sitting Timer',
                subtitle: 'Smart desk break reminders & check-ins',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const PostureHubScreen()),
                  );
                },
                isDark: isDark,
              ),
              const SizedBox(height: 10),

              // Achievements & Badges
              _buildNavCard(
                icon: Icons.emoji_events_outlined,
                color: AppColors.nutritionAmber,
                title: 'Achievements & Milestones',
                subtitle: 'Badges for consistency, PRs, and 5Ks',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AchievementsScreen()),
                  );
                },
                isDark: isDark,
              ),
              const SizedBox(height: 10),

              // Notes & Journal
              _buildNavCard(
                icon: Icons.edit_note,
                color: AppColors.progressIndigo,
                title: 'Daily Journal & Training Notes',
                subtitle: 'Record thoughts, posture cues, and reflections',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const JournalScreen()),
                  );
                },
                isDark: isDark,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPillarReportTile({
    required IconData icon,
    required Color color,
    required String pillar,
    required String value,
    required String detail,
    required bool isDark,
  }) {
    return ModuleCard(
      accentColor: color,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withAlpha(isDark ? 35 : 20),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  pillar,
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                Text(
                  detail,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavCard({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return ModuleCard(
      accentColor: color,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withAlpha(isDark ? 35 : 20),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.darkTextMuted),
        ],
      ),
    );
  }
}
