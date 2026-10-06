import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/achievements/state/achievement_providers.dart';

class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final achievements = ref.watch(achievementsProvider);

    final unlockedCount = achievements.where((a) => a.isUnlocked).length;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Milestones & Badges',
        subtitle: '$unlockedCount of ${achievements.length} unlocked',
        accentColor: AppColors.nutritionAmber,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Header Card
            ModuleCard(
              accentColor: AppColors.nutritionAmber,
              padding: const EdgeInsets.all(18),
              hasGlow: true,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.nutritionAmber.withAlpha(isDark ? 40 : 25),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.emoji_events, color: AppColors.nutritionAmber, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Discipline Unlocks',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Meaningful milestones earned through sustainable habits.',
                          style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            ...achievements.map((ach) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                child: ModuleCard(
                  accentColor: ach.isUnlocked ? AppColors.nutritionAmber : null,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: ach.isUnlocked
                              ? AppColors.nutritionAmber.withAlpha(isDark ? 40 : 25)
                              : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: ach.isUnlocked
                                ? AppColors.nutritionAmber
                                : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                        ),
                        child: Center(
                          child: Text(
                            ach.iconEmoji,
                            style: TextStyle(
                              fontSize: 26,
                              color: ach.isUnlocked ? null : Colors.grey,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  ach.title,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                const SizedBox(width: 8),
                                if (ach.isUnlocked)
                                  const Icon(Icons.check_circle, color: AppColors.successMint, size: 16),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              ach.description,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(3),
                              child: LinearProgressIndicator(
                                value: ach.progressPercentage,
                                backgroundColor: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  ach.isUnlocked ? AppColors.successMint : AppColors.nutritionAmber,
                                ),
                                minHeight: 4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
