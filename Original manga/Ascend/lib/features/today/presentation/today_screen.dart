import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/routine.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/navigation/main_navigation_screen.dart';
import 'package:ascend/features/routines/presentation/routines_screen.dart';
import 'package:ascend/features/settings/state/settings_providers.dart';
import 'package:ascend/features/today/state/today_providers.dart';
import 'widgets/add_activity_modal.dart';
import 'widgets/posture_checkin_card.dart';
import 'widgets/quick_stats_banner.dart';
import 'widgets/today_activity_tile.dart';

class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final plan = ref.watch(todayPlanProvider);
    final streak = ref.watch(currentStreakProvider);
    final profile = ref.watch(userProfileProvider);
    final now = DateTime.now();

    final morningItems = plan[TimeOfDayCategory.morning] ?? [];
    final afternoonItems = plan[TimeOfDayCategory.afternoon] ?? [];
    final eveningItems = plan[TimeOfDayCategory.evening] ?? [];

    final int totalPlanned = morningItems.length + afternoonItems.length + eveningItems.length;
    final int completedCount = [
      ...morningItems,
      ...afternoonItems,
      ...eveningItems,
    ].where((i) => i.isCompleted).length;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Today',
        subtitle: DateFormatters.formatFullDate(now),
        accentColor: AppColors.primaryTeal,
        showStreak: true,
        streakDays: streak,
        actions: [
          IconButton(
            icon: const Icon(Icons.tune),
            tooltip: 'Routine Manager',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const RoutinesScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(todayPlanProvider);
            ref.invalidate(exerciseLogsProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Greeting & Daily Progress Overview
                ModuleCard(
                  accentColor: AppColors.primaryTeal,
                  padding: const EdgeInsets.all(18),
                  hasGlow: true,
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Hello, ${profile.name} 👋',
                              style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              completedCount == totalPlanned && totalPlanned > 0
                                  ? 'All daily activities completed! Fantastic discipline.'
                                  : '$completedCount of $totalPlanned daily activities completed.',
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: totalPlanned > 0 ? (completedCount / totalPlanned) : 0.0,
                                backgroundColor: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryTeal),
                                minHeight: 6,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.primaryTeal.withAlpha(isDark ? 40 : 25),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          totalPlanned > 0 ? '${((completedCount / totalPlanned) * 100).round()}%' : '0%',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryTeal,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Quick Stats Banner (Calories + Hydration)
                const QuickStatsBanner(),
                const SizedBox(height: 14),

                // Posture Check-in interactive card
                const PostureCheckinCard(),
                const SizedBox(height: 18),

                // Gym Quick Action Card
                ModuleCard(
                  accentColor: AppColors.gymCoral,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  onTap: () {
                    ref.read(navigationIndexProvider.notifier).state = 1; // Switch to Gym tab
                  },
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.gymCoral.withAlpha(isDark ? 40 : 25),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.fitness_center, color: AppColors.gymCoral, size: 24),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Gym Strength Session',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Start live workout with progressive overload cues',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.gymCoral),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Schedule Header + Add button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Today's Plan",
                      style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
                    ),
                    TextButton.icon(
                      onPressed: () => AddActivityModal.show(context),
                      icon: const Icon(Icons.add, size: 18, color: AppColors.primaryTeal),
                      label: const Text(
                        'Add Activity',
                        style: TextStyle(color: AppColors.primaryTeal, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Morning Section
                if (morningItems.isNotEmpty) ...[
                  _buildSectionHeader('Morning 🌅', morningItems.length, isDark),
                  const SizedBox(height: 8),
                  ...morningItems.map((item) => TodayActivityTile(item: item)),
                  const SizedBox(height: 12),
                ],

                // Afternoon Section
                if (afternoonItems.isNotEmpty) ...[
                  _buildSectionHeader('Afternoon ☀️', afternoonItems.length, isDark),
                  const SizedBox(height: 8),
                  ...afternoonItems.map((item) => TodayActivityTile(item: item)),
                  const SizedBox(height: 12),
                ],

                // Evening Section
                if (eveningItems.isNotEmpty) ...[
                  _buildSectionHeader('Evening 🌙', eveningItems.length, isDark),
                  const SizedBox(height: 8),
                  ...eveningItems.map((item) => TodayActivityTile(item: item)),
                  const SizedBox(height: 12),
                ],

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, int count, bool isDark) {
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            '$count',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
            ),
          ),
        ),
      ],
    );
  }
}
