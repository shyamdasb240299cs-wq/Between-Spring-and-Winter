import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/gym/presentation/widgets/exercise_animation_widget.dart';
import 'package:ascend/features/gym/state/gym_history_providers.dart';

class ExerciseDetailScreen extends ConsumerWidget {
  final GymExercise exercise;

  const ExerciseDetailScreen({super.key, required this.exercise});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allSessions = ref.watch(gymSessionsProvider);
    final prStats = ref.watch(exercisePRProvider(exercise.id));

    final sortedSessions = allSessions.toList()..sort((a, b) => a.startTime.compareTo(b.startTime));

    final List<FlSpot> oneRmSpots = [];
    final List<Map<String, dynamic>> historicalSets = [];

    int index = 0;
    for (final session in sortedSessions) {
      double maxSession1RM = 0.0;
      for (final set in session.sets) {
        if (set.exerciseId == exercise.id && set.isCompleted && set.weightKg > 0) {
          if (set.estimated1RM > maxSession1RM) {
            maxSession1RM = set.estimated1RM;
          }
          historicalSets.add({
            'date': session.startTime,
            'weight': set.weightKg,
            'reps': set.reps,
            'isPR': set.isPR,
            '1rm': set.estimated1RM,
          });
        }
      }
      if (maxSession1RM > 0) {
        oneRmSpots.add(FlSpot(index.toDouble(), maxSession1RM));
        index++;
      }
    }

    final max1RMVal = oneRmSpots.map((s) => s.y).fold<double>(0.0, (a, b) => a > b ? a : b);
    final min1RMVal = oneRmSpots.map((s) => s.y).fold<double>(10000.0, (a, b) => a < b ? a : b);
    final chartMaxY = max1RMVal > 0 ? (max1RMVal * 1.15) : 100.0;
    final chartMinY = (min1RMVal > 0 && min1RMVal < 10000) ? (min1RMVal * 0.85) : 0.0;

    return Scaffold(
      appBar: CustomAppBar(
        title: exercise.name,
        subtitle: '${exercise.primaryMuscle.displayName} • ${exercise.equipment.displayName}',
        accentColor: AppColors.gymCoral,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Biomechanical Exercise Form Animation
              ExerciseAnimationWidget(
                exercise: exercise,
                height: 220,
              ),
              const SizedBox(height: 16),

              // 2. All-Time PR Card
              ModuleCard(
                accentColor: AppColors.gymCoral,
                padding: const EdgeInsets.all(18),
                hasGlow: true,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.gymCoral.withAlpha(isDark ? 40 : 25),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.emoji_events, color: AppColors.gymCoral, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'ALL-TIME PERSONAL RECORD',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.gymCoral,
                              letterSpacing: 1.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            prStats.maxWeight > 0
                                ? '${prStats.maxWeight} kg × ${prStats.maxReps} reps'
                                : 'No PR logged yet',
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                          ),
                          if (prStats.max1RM > 0)
                            Text(
                              'Estimated 1RM (Epley): ${prStats.max1RM.round()} kg',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // 3. Form & Mind-Muscle Cues
              Text(
                'Form Cues & Technique',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 8),
              ModuleCard(
                padding: const EdgeInsets.all(14),
                child: Text(
                  exercise.instructions.isNotEmpty
                      ? exercise.instructions
                      : 'Keep chest lifted, shoulders depressed and retracted, and core braced through the full range of motion.',
                  style: isDark ? AppTypography.bodyMediumDark : AppTypography.bodyMediumLight,
                ),
              ),
              const SizedBox(height: 20),

              // 4. Estimated 1RM Progression Line Chart (Responsive & Formatted)
              Text(
                'Estimated 1RM Progression Curve',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),

              ModuleCard(
                accentColor: AppColors.gymCoral,
                padding: const EdgeInsets.fromLTRB(12, 18, 16, 12),
                child: SizedBox(
                  height: 180,
                  child: oneRmSpots.length < 2
                      ? Center(
                          child: Text(
                            'Log sets across multiple sessions to plot strength progression.',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                          ),
                        )
                      : LineChart(
                          LineChartData(
                            minY: chartMinY,
                            maxY: chartMaxY,
                            lineTouchData: LineTouchData(
                              enabled: true,
                              touchTooltipData: LineTouchTooltipData(
                                getTooltipColor: (_) => isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                                getTooltipItems: (touchedSpots) {
                                  return touchedSpots.map((s) {
                                    return LineTooltipItem(
                                      'Session #${s.x.toInt() + 1}\n',
                                      TextStyle(
                                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                      children: [
                                        TextSpan(
                                          text: '${s.y.round()} kg (1RM)',
                                          style: const TextStyle(
                                            color: AppColors.gymCoral,
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
                              horizontalInterval: ((chartMaxY - chartMinY) / 3).clamp(5.0, 50.0),
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
                                  interval: ((chartMaxY - chartMinY) / 3).clamp(5.0, 50.0),
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
                                      'S${val.toInt() + 1}',
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
                                spots: oneRmSpots,
                                isCurved: true,
                                color: AppColors.gymCoral,
                                barWidth: 3.5,
                                isStrokeCapRound: true,
                                dotData: const FlDotData(show: true),
                                belowBarData: BarAreaData(
                                  show: true,
                                  color: AppColors.gymCoral.withAlpha(isDark ? 35 : 25),
                                ),
                              ),
                            ],
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 20),

              // 5. Set History
              Text(
                'Set History Logs',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),

              if (historicalSets.isEmpty)
                Text(
                  'No historical sets logged for this exercise.',
                  style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                )
              else
                ...historicalSets.reversed.take(10).map((s) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ModuleCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Row(
                        children: [
                          Text(
                            DateFormatters.formatShortDate(s['date'] as DateTime),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          const Spacer(),
                          Text(
                            '${s['weight']} kg × ${s['reps']} reps',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          if (s['isPR'] == true) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.gymCoral.withAlpha(isDark ? 40 : 25),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text('PR', style: TextStyle(color: AppColors.gymCoral, fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                          ],
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
