import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/database/hive_service.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/models/gym_workout_template.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/gym/state/gym_history_providers.dart';
import 'package:ascend/features/gym/state/gym_session_controller.dart';
import 'exercise_library_screen.dart';
import 'live_workout_screen.dart';
import 'template_editor_screen.dart';

class GymHomeScreen extends ConsumerWidget {
  const GymHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sessions = ref.watch(gymSessionsProvider);
    final weeklyVolume = ref.watch(weeklyVolumeStatsProvider);

    final templates = HiveService.instance.gymTemplatesBox.values
        .map((v) => GymWorkoutTemplate.fromMap(v))
        .toList();

    final allExercises = HiveService.instance.gymExercisesBox.values
        .map((v) => GymExercise.fromMap(v))
        .toList();

    // Max volume calculation for chart scaling
    final maxVol = weeklyVolume.map((e) => e.totalVolumeKg).fold<double>(0.0, (a, b) => a > b ? a : b);
    final calculatedMaxY = maxVol > 0 ? (maxVol * 1.25) : 1000.0;
    final intervalY = (calculatedMaxY / 3).clamp(200.0, 50000.0);

    // Current weekday: 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday
    final todayWeekday = DateTime.now().weekday;
    final todaySplit = _getScheduledSplitForDay(todayWeekday, templates);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Gym & Strength',
        subtitle: '5-Day Progressive Overload',
        accentColor: AppColors.gymCoral,
        actions: [
          IconButton(
            icon: const Icon(Icons.fitness_center),
            tooltip: 'Exercise Library',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const GymExerciseLibraryScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.add_box_outlined),
            tooltip: 'Create Template',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const TemplateEditorScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(gymSessionsProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Interactive 5-Day Split Schedule & Today's Target Card
                _buildTodayTargetBanner(context, ref, isDark, todayWeekday, todaySplit, allExercises),
                const SizedBox(height: 16),

                // 2. 5-Day Weekly Schedule Rhythm Pills
                _buildWeeklyRhythmPills(isDark, todayWeekday),
                const SizedBox(height: 18),

                // 3. Quick Start Free-Form Workout
                ModuleCard(
                  accentColor: AppColors.gymCoral,
                  padding: const EdgeInsets.all(16),
                  onTap: () {
                    ref.read(liveGymSessionProvider.notifier).startCustomWorkout(name: 'Quick Workout');
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const LiveWorkoutScreen()),
                    );
                  },
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.gymCoral.withAlpha(isDark ? 40 : 25),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.add_circle_outline_rounded, color: AppColors.gymCoral, size: 24),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Start Free-Form Session',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Log custom exercises dynamically with 1RM PR detection',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.gymCoral, size: 20),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 4. Weekly Volume Progression Bar Chart (Fixed Overflow & Formatted)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'Weekly Volume Progression',
                        style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${weeklyVolume.fold<double>(0.0, (acc, e) => acc + e.totalVolumeKg).round()} kg total',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.gymCoral),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ModuleCard(
                  accentColor: AppColors.gymCoral,
                  padding: const EdgeInsets.fromLTRB(12, 18, 16, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        height: 160,
                        child: BarChart(
                          BarChartData(
                            alignment: BarChartAlignment.spaceAround,
                            maxY: calculatedMaxY,
                            minY: 0,
                            barTouchData: BarTouchData(
                              enabled: true,
                              touchTooltipData: BarTouchTooltipData(
                                getTooltipColor: (_) => isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                                getTooltipItem: (group, groupIndex, rod, rodIndex) {
                                  final label = weeklyVolume[group.x.toInt()].label;
                                  return BarTooltipItem(
                                    '$label\n',
                                    TextStyle(
                                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                    children: [
                                      TextSpan(
                                        text: '${rod.toY.round()} kg',
                                        style: const TextStyle(
                                          color: AppColors.gymCoral,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  );
                                },
                              ),
                            ),
                            titlesData: FlTitlesData(
                              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              leftTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  reservedSize: 38,
                                  interval: intervalY,
                                  getTitlesWidget: (val, meta) {
                                    if (val == 0) return const SizedBox.shrink();
                                    if (val >= 1000) {
                                      final kVal = (val / 1000).toStringAsFixed(val % 1000 == 0 ? 0 : 1);
                                      return Text(
                                        '${kVal}k',
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                        ),
                                      );
                                    }
                                    return Text(
                                      '${val.round()}',
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
                                  reservedSize: 26,
                                  getTitlesWidget: (value, meta) {
                                    final idx = value.toInt();
                                    if (idx >= 0 && idx < weeklyVolume.length) {
                                      return Padding(
                                        padding: const EdgeInsets.only(top: 6),
                                        child: Text(
                                          weeklyVolume[idx].label,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                          ),
                                        ),
                                      );
                                    }
                                    return const SizedBox.shrink();
                                  },
                                ),
                              ),
                            ),
                            gridData: FlGridData(
                              show: true,
                              drawVerticalLine: false,
                              horizontalInterval: intervalY,
                              getDrawingHorizontalLine: (val) => FlLine(
                                color: (isDark ? Colors.white : Colors.black).withAlpha(15),
                                strokeWidth: 1,
                                dashArray: [4, 4],
                              ),
                            ),
                            borderData: FlBorderData(show: false),
                            barGroups: List.generate(weeklyVolume.length, (i) {
                              final item = weeklyVolume[i];
                              return BarChartGroupData(
                                x: i,
                                barRods: [
                                  BarChartRodData(
                                    toY: item.totalVolumeKg,
                                    color: AppColors.gymCoral,
                                    width: 22,
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                                    backDrawRodData: BackgroundBarChartRodData(
                                      show: true,
                                      toY: calculatedMaxY,
                                      color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                                    ),
                                  ),
                                ],
                              );
                            }),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),

                // 5. Workout Templates List (Categorized 5-Day Splits)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '5-Day Split Routines',
                        style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const TemplateEditorScreen()),
                        );
                      },
                      child: const Text(
                        '+ New Split',
                        style: TextStyle(color: AppColors.gymCoral, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                ...templates.map((tpl) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ModuleCard(
                      accentColor: AppColors.gymCoral,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.gymCoral.withAlpha(isDark ? 35 : 20),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.fitness_center, color: AppColors.gymCoral, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      tpl.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${tpl.exerciseIds.length} exercises • ${tpl.splitCategory}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.gymCoral,
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                ),
                                onPressed: () {
                                  ref.read(liveGymSessionProvider.notifier).startWorkoutFromTemplate(tpl, allExercises);
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const LiveWorkoutScreen()),
                                  );
                                },
                                child: const Text('Start', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          if (tpl.description.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              tpl.description,
                              style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 20),

                // 6. Recent Workout History
                Text(
                  'Recent Workout History',
                  style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
                ),
                const SizedBox(height: 10),

                if (sessions.isEmpty)
                  ModuleCard(
                    padding: const EdgeInsets.all(20),
                    child: Center(
                      child: Text(
                        'No gym sessions recorded yet. Start your first session above!',
                        style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                      ),
                    ),
                  )
                else
                  ...sessions.take(5).map((session) {
                    final completedSets = session.sets.where((s) => s.isCompleted).length;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ModuleCard(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  session.templateName,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  DateFormatters.formatShortDate(session.startTime),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${session.totalVolumeKg.round()} kg',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.gymCoral),
                                ),
                                Text(
                                  '$completedSets sets • ${session.durationMinutes} min',
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

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static GymWorkoutTemplate? _getScheduledSplitForDay(int weekday, List<GymWorkoutTemplate> templates) {
    // 1=Mon(Rest), 2=Tue(Legs), 3=Wed(Rest), 4=Thu(Back&Bis), 5=Fri(Chest&Tris), 6=Sat(Core), 7=Sun(Full Body)
    String searchId;
    switch (weekday) {
      case DateTime.tuesday:
        searchId = 'tpl_split_legs';
        break;
      case DateTime.thursday:
        searchId = 'tpl_split_back_biceps';
        break;
      case DateTime.friday:
        searchId = 'tpl_split_chest_triceps';
        break;
      case DateTime.saturday:
        searchId = 'tpl_split_core_others';
        break;
      case DateTime.sunday:
        searchId = 'tpl_split_full_body';
        break;
      default:
        return null; // Rest Days (Monday, Wednesday)
    }

    try {
      return templates.firstWhere((t) => t.id == searchId);
    } catch (_) {
      return templates.isNotEmpty ? templates.first : null;
    }
  }

  Widget _buildTodayTargetBanner(
    BuildContext context,
    WidgetRef ref,
    bool isDark,
    int weekday,
    GymWorkoutTemplate? todaySplit,
    List<GymExercise> allExercises,
  ) {
    final isRestDay = weekday == DateTime.monday || weekday == DateTime.wednesday || todaySplit == null;

    if (isRestDay) {
      final nextDayName = weekday == DateTime.monday ? 'Tomorrow (Tuesday): Legs & Lower Body' : 'Tomorrow (Thursday): Back & Biceps';
      return ModuleCard(
        accentColor: AppColors.primaryTeal,
        hasGlow: true,
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.primaryTeal.withAlpha(isDark ? 40 : 25),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.bedtime_rounded, color: AppColors.primaryTeal, size: 28),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Today: Rest & Active Recovery 🛌',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Spine decompression, posture mobility & recovery. $nextDayName',
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
      );
    }

    return ModuleCard(
      accentColor: AppColors.gymCoral,
      hasGlow: true,
      padding: const EdgeInsets.all(18),
      onTap: () {
        ref.read(liveGymSessionProvider.notifier).startWorkoutFromTemplate(todaySplit, allExercises);
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const LiveWorkoutScreen()),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.gymCoral.withAlpha(isDark ? 50 : 30),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'TODAY\'S TARGET',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppColors.gymCoral,
                      letterSpacing: 0.8,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${todaySplit.exerciseIds.length} Exercises',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            todaySplit.name,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            todaySplit.description,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.gymCoral,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.play_arrow_rounded, size: 22),
              label: const Text(
                'Start Today\'s Workout',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              onPressed: () {
                ref.read(liveGymSessionProvider.notifier).startWorkoutFromTemplate(todaySplit, allExercises);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LiveWorkoutScreen()),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeeklyRhythmPills(bool isDark, int currentWeekday) {
    final days = [
      {'day': 'Mon', 'label': 'Rest', 'isRest': true, 'weekday': 1},
      {'day': 'Tue', 'label': 'Legs', 'isRest': false, 'weekday': 2},
      {'day': 'Wed', 'label': 'Rest', 'isRest': true, 'weekday': 3},
      {'day': 'Thu', 'label': 'Pull', 'isRest': false, 'weekday': 4},
      {'day': 'Fri', 'label': 'Push', 'isRest': false, 'weekday': 5},
      {'day': 'Sat', 'label': 'Core', 'isRest': false, 'weekday': 6},
      {'day': 'Sun', 'label': 'Full', 'isRest': false, 'weekday': 7},
    ];

    return Row(
      children: days.map((d) {
        final isToday = d['weekday'] == currentWeekday;
        final isRest = d['isRest'] as bool;
        final color = isRest ? AppColors.primaryTeal : AppColors.gymCoral;

        return Expanded(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 2),
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: isToday
                  ? color.withAlpha(isDark ? 55 : 35)
                  : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isToday ? color : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                width: isToday ? 1.5 : 1,
              ),
            ),
            child: Column(
              children: [
                Text(
                  d['day'] as String,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isToday ? FontWeight.w800 : FontWeight.w600,
                    color: isToday ? color : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  d['label'] as String,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: isRest ? AppColors.primaryTeal : (isToday ? color : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted)),
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
