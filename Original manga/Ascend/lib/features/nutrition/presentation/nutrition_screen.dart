import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/core/widgets/progress_ring.dart';
import 'package:ascend/features/settings/state/settings_providers.dart';
import 'package:ascend/features/nutrition/state/nutrition_providers.dart';
import 'log_meal_screen.dart';
import 'tdee_calculator_screen.dart';
import 'water_tracker_widget.dart';

class NutritionScreen extends ConsumerWidget {
  const NutritionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final summary = ref.watch(dailyNutritionSummaryProvider);
    final profile = ref.watch(userProfileProvider);

    final isDeficit = summary.netBalance < 0;
    final balanceColor = isDeficit ? AppColors.successMint : AppColors.nutritionAmber;

    // Macro progress ratios
    final proteinProgress = profile.targetProteinGrams > 0 ? (summary.totalProteinGrams / profile.targetProteinGrams) : 0.0;
    final carbsProgress = profile.targetCarbsGrams > 0 ? (summary.totalCarbsGrams / profile.targetCarbsGrams) : 0.0;
    final fatProgress = profile.targetFatGrams > 0 ? (summary.totalFatGrams / profile.targetFatGrams) : 0.0;
    final calorieProgress = summary.targetCalories > 0 ? (summary.totalCalories / summary.targetCalories) : 0.0;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Nutrition & Calories',
        subtitle: 'Daily Energy & Macro Tracking',
        accentColor: AppColors.nutritionAmber,
        actions: [
          IconButton(
            icon: const Icon(Icons.calculate_outlined),
            tooltip: 'TDEE Settings',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const TDEECalculatorScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Log Meal',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const LogMealScreen()),
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
              // Calorie Balance Hero Card
              ModuleCard(
                accentColor: AppColors.nutritionAmber,
                padding: const EdgeInsets.all(20),
                hasGlow: true,
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'CONSUMED',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.nutritionAmber),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${summary.totalCalories.round()} kcal',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                        // Main Calorie Ring
                        ProgressRing(
                          progress: calorieProgress,
                          size: 90,
                          strokeWidth: 9,
                          progressColor: AppColors.nutritionAmber,
                          centerChild: Text(
                            '${(calorieProgress * 100).round()}%',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text(
                              'BURNED (TDEE)',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gymCoral),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${summary.caloriesBurned.round()} kcal',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 12),
                    // Net Balance summary row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Net Calorie Balance:',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: balanceColor.withAlpha(isDark ? 35 : 20),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            isDeficit
                                ? '${summary.netBalance.round()} kcal (Deficit)'
                                : '+${summary.netBalance.round()} kcal (Surplus)',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: balanceColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Macro Progress Rings
              Text(
                'Macronutrient Targets',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _buildMacroRingCard(
                      title: 'Protein',
                      current: summary.totalProteinGrams.round(),
                      target: profile.targetProteinGrams.round(),
                      progress: proteinProgress,
                      color: AppColors.gymCoral,
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildMacroRingCard(
                      title: 'Carbs',
                      current: summary.totalCarbsGrams.round(),
                      target: profile.targetCarbsGrams.round(),
                      progress: carbsProgress,
                      color: AppColors.nutritionAmber,
                      isDark: isDark,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildMacroRingCard(
                      title: 'Fat',
                      current: summary.totalFatGrams.round(),
                      target: profile.targetFatGrams.round(),
                      progress: fatProgress,
                      color: AppColors.progressIndigo,
                      isDark: isDark,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Hydration Tracker
              const WaterTrackerWidget(),
              const SizedBox(height: 20),

              // Meals Diary Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Today's Food Diary",
                    style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
                  ),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const LogMealScreen()),
                      );
                    },
                    icon: const Icon(Icons.add, size: 18, color: AppColors.nutritionAmber),
                    label: const Text('Add Meal', style: TextStyle(color: AppColors.nutritionAmber, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              if (summary.todayMeals.isEmpty)
                ModuleCard(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'No meals logged today yet. Tap "Add Meal" to record food.',
                      style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                    ),
                  ),
                )
              else
                ...summary.todayMeals.map((meal) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ModuleCard(
                      accentColor: AppColors.nutritionAmber,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.nutritionAmber.withAlpha(isDark ? 35 : 20),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.restaurant, color: AppColors.nutritionAmber, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  meal.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${meal.mealType.displayName} • ${meal.calories.round()} kcal (P: ${meal.proteinGrams.round()}g, C: ${meal.carbsGrams.round()}g, F: ${meal.fatGrams.round()}g)',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Icon(
                              meal.isFavorite ? Icons.star : Icons.star_border,
                              color: meal.isFavorite ? AppColors.nutritionAmber : AppColors.darkTextMuted,
                              size: 20,
                            ),
                            onPressed: () {
                              ref.read(nutritionEntriesProvider.notifier).toggleFavorite(meal.id);
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: AppColors.errorRed, size: 20),
                            onPressed: () {
                              ref.read(nutritionEntriesProvider.notifier).deleteEntry(meal.id);
                            },
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

  Widget _buildMacroRingCard({
    required String title,
    required int current,
    required int target,
    required double progress,
    required Color color,
    required bool isDark,
  }) {
    return ModuleCard(
      accentColor: color,
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Text(
            title,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
          ),
          const SizedBox(height: 10),
          ProgressRing(
            progress: progress,
            size: 54,
            strokeWidth: 5,
            progressColor: color,
            centerChild: Text(
              '${(progress * 100).round()}%',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$current / ${target}g',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
