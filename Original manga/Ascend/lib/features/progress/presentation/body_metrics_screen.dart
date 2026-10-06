import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/progress/state/progress_providers.dart';
import 'log_metric_modal.dart';

class BodyMetricsScreen extends ConsumerWidget {
  const BodyMetricsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final metrics = ref.watch(bodyMetricsProvider);

    final List<FlSpot> weightSpots = [];

    for (int i = 0; i < metrics.length; i++) {
      weightSpots.add(FlSpot(i.toDouble(), metrics[i].weightKg));
    }

    final latestMetric = metrics.isNotEmpty ? metrics.last : null;
    final firstMetric = metrics.isNotEmpty ? metrics.first : null;
    final double weightDelta = (latestMetric != null && firstMetric != null)
        ? (latestMetric.weightKg - firstMetric.weightKg)
        : 0.0;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Body Metrics & Trends',
        subtitle: 'Long-term composition tracking',
        accentColor: AppColors.progressIndigo,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Log Metric',
            onPressed: () => LogMetricModal.show(context),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary Cards
              Row(
                children: [
                  Expanded(
                    child: ModuleCard(
                      accentColor: AppColors.progressIndigo,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'CURRENT WEIGHT',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.progressIndigo,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            latestMetric != null ? '${latestMetric.weightKg} kg' : '--',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            weightDelta != 0.0
                                ? '${weightDelta > 0 ? '+' : ''}${weightDelta.toStringAsFixed(1)} kg overall'
                                : 'Steady trend',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ModuleCard(
                      accentColor: AppColors.primaryTeal,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'WAIST LINE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryTeal,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            latestMetric?.waistCm != null ? '${latestMetric!.waistCm} cm' : '--',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Posture & core baseline',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Weight Trend Chart
              Text(
                'Weight Progression Trend',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),
              ModuleCard(
                accentColor: AppColors.progressIndigo,
                padding: const EdgeInsets.fromLTRB(14, 20, 20, 14),
                child: SizedBox(
                  height: 180,
                  child: weightSpots.length < 2
                      ? Center(
                          child: Text(
                            'Log at least 2 entries to see the smooth trend curve.',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                          ),
                        )
                      : Builder(
                          builder: (context) {
                            final minW = weightSpots.map((s) => s.y).fold<double>(500.0, (a, b) => a < b ? a : b);
                            final maxW = weightSpots.map((s) => s.y).fold<double>(0.0, (a, b) => a > b ? a : b);
                            final chartMin = (minW - 2.0).clamp(0.0, 500.0);
                            final chartMax = maxW + 2.0;

                            return LineChart(
                              LineChartData(
                                minY: chartMin,
                                maxY: chartMax,
                                lineTouchData: LineTouchData(
                                  enabled: true,
                                  touchTooltipData: LineTouchTooltipData(
                                    getTooltipColor: (_) => isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                                    getTooltipItems: (touchedSpots) {
                                      return touchedSpots.map((s) {
                                        return LineTooltipItem(
                                          'Entry #${s.x.toInt() + 1}\n',
                                          TextStyle(
                                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 11,
                                          ),
                                          children: [
                                            TextSpan(
                                              text: '${s.y.toStringAsFixed(1)} kg',
                                              style: const TextStyle(
                                                color: AppColors.progressIndigo,
                                                fontWeight: FontWeight.w800,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        );
                                      }).toList();
                                    },
                                  ),
                                ),
                                gridData: FlGridData(
                                  show: true,
                                  drawVerticalLine: false,
                                  horizontalInterval: ((chartMax - chartMin) / 3).clamp(1.0, 50.0),
                                  getDrawingHorizontalLine: (_) => FlLine(
                                    color: (isDark ? Colors.white : Colors.black).withAlpha(15),
                                    strokeWidth: 1,
                                    dashArray: [4, 4],
                                  ),
                                ),
                                titlesData: FlTitlesData(
                                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  leftTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      reservedSize: 36,
                                      interval: ((chartMax - chartMin) / 3).clamp(1.0, 50.0),
                                      getTitlesWidget: (val, meta) {
                                        return Text(
                                          '${val.round()}k',
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                  bottomTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      reservedSize: 22,
                                      getTitlesWidget: (val, meta) {
                                        return Text(
                                          '#${val.toInt() + 1}',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                                borderData: FlBorderData(show: false),
                                lineBarsData: [
                                  LineChartBarData(
                                    spots: weightSpots,
                                    isCurved: true,
                                    color: AppColors.progressIndigo,
                                    barWidth: 3.5,
                                    isStrokeCapRound: true,
                                    dotData: const FlDotData(show: true),
                                    belowBarData: BarAreaData(
                                      show: true,
                                      color: AppColors.progressIndigo.withAlpha(isDark ? 35 : 25),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ),
              const SizedBox(height: 24),

              // Measurement History Log
              Text(
                'Historical Logs',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),

              ...metrics.reversed.map((m) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ModuleCard(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              DateFormatters.formatShortDate(m.date),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            if (m.notes.isNotEmpty)
                              Text(
                                m.notes,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                ),
                              ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${m.weightKg} kg',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            if (m.waistCm != null)
                              Text(
                                'Waist: ${m.waistCm} cm',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
