import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/reports/state/report_providers.dart';

class ActivityHeatmapScreen extends ConsumerWidget {
  const ActivityHeatmapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final heatmapDays = ref.watch(calendarHeatmapProvider);

    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Activity Heatmap',
        subtitle: 'Past 4-week discipline grid',
        accentColor: AppColors.successMint,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Legend
              ModuleCard(
                padding: const EdgeInsets.all(14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildLegendItem('Completed', AppColors.successMint),
                    _buildLegendItem('Partial', AppColors.warningAmber),
                    _buildLegendItem('Missed', AppColors.errorRed.withAlpha(160)),
                    _buildLegendItem('Rest', isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Calendar Grid
              Text(
                'Daily Consistency Heatmap',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 12),

              ModuleCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    // Day of week labels
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day) {
                        return Expanded(
                          child: Center(
                            child: Text(
                              day,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),

                    // Grid of 28 days (4 rows of 7)
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 7,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: heatmapDays.length,
                      itemBuilder: (context, index) {
                        final d = heatmapDays[index];
                        Color cellColor;
                        switch (d.state) {
                          case DayActivityState.completed:
                            cellColor = AppColors.successMint;
                            break;
                          case DayActivityState.partial:
                            cellColor = AppColors.warningAmber;
                            break;
                          case DayActivityState.missed:
                            cellColor = AppColors.errorRed.withAlpha(120);
                            break;
                          case DayActivityState.restDay:
                            cellColor = isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant;
                            break;
                        }

                        return Tooltip(
                          message: '${DateFormatters.formatShortDate(d.date)}: ${d.completedCount} activities',
                          child: Container(
                            decoration: BoxDecoration(
                              color: cellColor,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                '${d.date.day}',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: d.state == DayActivityState.completed || d.state == DayActivityState.partial
                                      ? Colors.black87
                                      : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Discipline Insight
              ModuleCard(
                accentColor: AppColors.successMint,
                child: Row(
                  children: [
                    const Icon(Icons.local_fire_department, color: AppColors.successMint),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Habit Stacking Principle', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 2),
                          Text(
                            'Consistency over intensity. Completing at least 1 posture routine on busy days keeps the neural habit loop alive.',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3)),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
