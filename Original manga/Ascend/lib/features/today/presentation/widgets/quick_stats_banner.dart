import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/navigation/main_navigation_screen.dart';
import 'package:ascend/features/nutrition/state/nutrition_providers.dart';

class QuickStatsBanner extends ConsumerWidget {
  const QuickStatsBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final nutrition = ref.watch(dailyNutritionSummaryProvider);

    final isDeficit = nutrition.netBalance < 0;
    final balanceText = isDeficit
        ? '${nutrition.netBalance.round()} kcal (deficit)'
        : '+${nutrition.netBalance.round()} kcal (surplus)';

    return Row(
      children: [
        // Calorie snapshot
        Expanded(
          child: ModuleCard(
            accentColor: AppColors.nutritionAmber,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            onTap: () {
              ref.read(navigationIndexProvider.notifier).state = 2; // Jump to Nutrition tab
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.local_fire_department, size: 16, color: AppColors.nutritionAmber),
                    SizedBox(width: 4),
                    Text(
                      'Net Balance',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.nutritionAmber,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  balanceText,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  'In: ${nutrition.totalCalories.round()} • Out: ${nutrition.caloriesBurned.round()}',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 10),
        // Hydration snapshot
        Expanded(
          child: ModuleCard(
            accentColor: AppColors.infoBlue,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            onTap: () {
              ref.read(waterEntriesProvider.notifier).addWater(250);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Added +250ml water 💧'),
                  duration: Duration(seconds: 1),
                ),
              );
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.water_drop, size: 16, color: AppColors.infoBlue),
                    SizedBox(width: 4),
                    Text(
                      'Hydration',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.infoBlue,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${nutrition.waterConsumedMl} / ${nutrition.waterGoalMl} ml',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                const Text(
                  'Tap to +250 ml',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.infoBlue,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
