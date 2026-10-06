import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/activity.dart';
import 'package:ascend/core/models/routine.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/empty_state_view.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/routines/state/routine_providers.dart';
import 'activity_library_screen.dart';
import 'create_routine_screen.dart';

class RoutinesScreen extends ConsumerWidget {
  const RoutinesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final routines = ref.watch(routinesProvider);
    final activities = ref.watch(activitiesProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Routine Manager',
        subtitle: 'Configure daily & recurring schedules',
        accentColor: AppColors.primaryTeal,
        actions: [
          IconButton(
            icon: const Icon(Icons.fitness_center),
            tooltip: 'Activity Library',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ActivityLibraryScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'New Routine',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CreateRoutineScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: routines.isEmpty
            ? EmptyStateView(
                icon: Icons.schedule,
                title: 'No Routines Created',
                message: 'Create your first daily posture or fitness routine to stay consistent.',
                actionLabel: 'Create Routine',
                onAction: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const CreateRoutineScreen()),
                  );
                },
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: routines.length,
                itemBuilder: (context, index) {
                  final routine = routines[index];
                  final daysText = routine.daysOfWeek.isEmpty
                      ? 'Every Day'
                      : routine.daysOfWeek.map((d) {
                          switch (d) {
                            case 1:
                              return 'Mon';
                            case 2:
                              return 'Tue';
                            case 3:
                              return 'Wed';
                            case 4:
                              return 'Thu';
                            case 5:
                              return 'Fri';
                            case 6:
                              return 'Sat';
                            case 7:
                              return 'Sun';
                            default:
                              return '';
                          }
                        }).join(', ');

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ModuleCard(
                      accentColor: routine.isEnabled ? AppColors.primaryTeal : null,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryTeal.withAlpha(isDark ? 35 : 20),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  routine.timeOfDay == TimeOfDayCategory.morning
                                      ? Icons.wb_sunny
                                      : routine.timeOfDay == TimeOfDayCategory.afternoon
                                          ? Icons.wb_twilight
                                          : Icons.nightlight_round,
                                  color: AppColors.primaryTeal,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      routine.title,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '$daysText • ${routine.timeOfDay.name.toUpperCase()}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Switch(
                                value: routine.isEnabled,
                                activeThumbColor: AppColors.primaryTeal,
                                onChanged: (val) {
                                  ref.read(routinesProvider.notifier).toggleRoutineEnabled(routine.id);
                                },
                              ),
                            ],
                          ),
                          if (routine.description.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              routine.description,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          const Divider(),
                          const SizedBox(height: 8),
                          // Activities in this routine
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: routine.activityIds.map((actId) {
                              final act = activities.firstWhere(
                                (a) => a.id == actId,
                                orElse: () => Activity(
                                  id: actId,
                                  title: 'Activity',
                                  description: '',
                                  type: ActivityType.reps,
                                  category: ActivityCategory.posture,
                                ),
                              );
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  act.title,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton.icon(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => CreateRoutineScreen(initialRoutine: routine),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.edit, size: 16),
                                label: const Text('Edit'),
                              ),
                              TextButton.icon(
                                onPressed: () {
                                  ref.read(routinesProvider.notifier).deleteRoutine(routine.id);
                                },
                                icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.errorRed),
                                label: const Text('Delete', style: TextStyle(color: AppColors.errorRed)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}
