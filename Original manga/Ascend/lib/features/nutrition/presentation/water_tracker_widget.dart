import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/nutrition/state/nutrition_providers.dart';

class WaterTrackerWidget extends ConsumerWidget {
  const WaterTrackerWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final summary = ref.watch(dailyNutritionSummaryProvider);

    final ratio = summary.waterGoalMl > 0
        ? (summary.waterConsumedMl / summary.waterGoalMl).clamp(0.0, 1.0)
        : 0.0;

    return ModuleCard(
      accentColor: AppColors.infoBlue,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.water_drop, color: AppColors.infoBlue, size: 22),
              const SizedBox(width: 8),
              const Text(
                'Hydration Tracker',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.infoBlue),
              ),
              const Spacer(),
              Text(
                '${summary.waterConsumedMl} / ${summary.waterGoalMl} ml',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 8,
              backgroundColor: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.infoBlue),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildWaterBtn(context, ref, '+250 ml', 250, isDark),
              _buildWaterBtn(context, ref, '+500 ml', 500, isDark),
              _buildWaterBtn(context, ref, '+750 ml', 750, isDark),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWaterBtn(BuildContext context, WidgetRef ref, String label, int amount, bool isDark) {
    return InkWell(
      onTap: () {
        ref.read(waterEntriesProvider.notifier).addWater(amount);
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.infoBlue.withAlpha(isDark ? 50 : 35)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.infoBlue,
          ),
        ),
      ),
    );
  }
}
