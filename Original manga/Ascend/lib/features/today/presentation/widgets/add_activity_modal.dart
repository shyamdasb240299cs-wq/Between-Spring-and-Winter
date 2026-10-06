import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/routine.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/routines/state/routine_providers.dart';

class AddActivityModal extends ConsumerStatefulWidget {
  const AddActivityModal({super.key});

  static Future<void> show(BuildContext context) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const AddActivityModal(),
    );
  }

  @override
  ConsumerState<AddActivityModal> createState() => _AddActivityModalState();
}

class _AddActivityModalState extends ConsumerState<AddActivityModal> {
  TimeOfDayCategory _selectedTime = TimeOfDayCategory.morning;
  final Set<String> _selectedActivityIds = {};

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allActivities = ref.watch(activitiesProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Add to Today',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Time of Day', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildTimeChip(TimeOfDayCategory.morning, 'Morning 🌅', isDark),
              const SizedBox(width: 8),
              _buildTimeChip(TimeOfDayCategory.afternoon, 'Afternoon ☀️', isDark),
              const SizedBox(width: 8),
              _buildTimeChip(TimeOfDayCategory.evening, 'Evening 🌙', isDark),
            ],
          ),
          const SizedBox(height: 16),
          const Text('Select Activities', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              itemCount: allActivities.length,
              itemBuilder: (context, index) {
                final act = allActivities[index];
                final isSelected = _selectedActivityIds.contains(act.id);

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ModuleCard(
                    accentColor: isSelected ? AppColors.primaryTeal : null,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selectedActivityIds.remove(act.id);
                        } else {
                          _selectedActivityIds.add(act.id);
                        }
                      });
                    },
                    child: Row(
                      children: [
                        Icon(
                          isSelected ? Icons.check_box : Icons.check_box_outline_blank,
                          color: isSelected ? AppColors.primaryTeal : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                act.title,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                              ),
                              Text(
                                '${act.targetArea} • ${act.category.name.toUpperCase()}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _selectedActivityIds.isEmpty
                  ? null
                  : () async {
                      final newRoutine = Routine(
                        id: const Uuid().v4(),
                        title: 'Today Schedule',
                        activityIds: _selectedActivityIds.toList(),
                        timeOfDay: _selectedTime,
                        daysOfWeek: [DateTime.now().weekday],
                        createdAt: DateTime.now(),
                      );
                      await ref.read(routinesProvider.notifier).addOrUpdateRoutine(newRoutine);
                      if (context.mounted) Navigator.of(context).pop();
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryTeal,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(
                'Add ${_selectedActivityIds.length} Activities to Today',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeChip(TimeOfDayCategory cat, String label, bool isDark) {
    final isSelected = _selectedTime == cat;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedTime = cat),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primaryTeal.withAlpha(isDark ? 40 : 25)
                : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primaryTeal : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected
                    ? AppColors.primaryTeal
                    : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
