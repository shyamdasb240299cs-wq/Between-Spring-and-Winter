import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/routine.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/routines/state/routine_providers.dart';

class CreateRoutineScreen extends ConsumerStatefulWidget {
  final Routine? initialRoutine;

  const CreateRoutineScreen({super.key, this.initialRoutine});

  @override
  ConsumerState<CreateRoutineScreen> createState() => _CreateRoutineScreenState();
}

class _CreateRoutineScreenState extends ConsumerState<CreateRoutineScreen> {
  late TextEditingController _titleController;
  late TextEditingController _descController;
  late TimeOfDayCategory _timeOfDay;
  late List<int> _selectedDays; // 1 = Mon .. 7 = Sun
  late Set<String> _selectedActivityIds;
  String? _reminderTime;

  @override
  void initState() {
    super.initState();
    final r = widget.initialRoutine;
    _titleController = TextEditingController(text: r?.title ?? '');
    _descController = TextEditingController(text: r?.description ?? '');
    _timeOfDay = r?.timeOfDay ?? TimeOfDayCategory.morning;
    _selectedDays = r?.daysOfWeek.toList() ?? [];
    _selectedActivityIds = r?.activityIds.toSet() ?? {};
    _reminderTime = r?.reminderTime ?? '07:30';
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _saveRoutine() async {
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a routine name.')),
      );
      return;
    }

    if (_selectedActivityIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one activity.')),
      );
      return;
    }

    final newRoutine = Routine(
      id: widget.initialRoutine?.id ?? const Uuid().v4(),
      title: _titleController.text.trim(),
      description: _descController.text.trim(),
      activityIds: _selectedActivityIds.toList(),
      timeOfDay: _timeOfDay,
      daysOfWeek: _selectedDays,
      reminderTime: _reminderTime,
      isEnabled: widget.initialRoutine?.isEnabled ?? true,
      createdAt: widget.initialRoutine?.createdAt ?? DateTime.now(),
    );

    await ref.read(routinesProvider.notifier).addOrUpdateRoutine(newRoutine);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allActivities = ref.watch(activitiesProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: widget.initialRoutine == null ? 'Create Routine' : 'Edit Routine',
        accentColor: AppColors.primaryTeal,
        actions: [
          TextButton(
            onPressed: _saveRoutine,
            child: const Text('Save', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Routine Title',
                  hintText: 'e.g. Daily Posture & Chin Tucks',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descController,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  hintText: 'e.g. Spine realignment after work',
                ),
              ),
              const SizedBox(height: 20),

              // Time of Day
              const Text('Time of Day', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
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
              const SizedBox(height: 20),

              // Frequency & Days
              const Text('Frequency (Days)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _selectedDays.clear(); // Daily
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _selectedDays.isEmpty
                            ? AppColors.primaryTeal.withAlpha(isDark ? 40 : 25)
                            : null,
                        side: BorderSide(
                          color: _selectedDays.isEmpty ? AppColors.primaryTeal : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                        ),
                      ),
                      child: const Text('Every Day (Daily)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildDayBtn(1, 'M', isDark),
                  _buildDayBtn(2, 'T', isDark),
                  _buildDayBtn(3, 'W', isDark),
                  _buildDayBtn(4, 'T', isDark),
                  _buildDayBtn(5, 'F', isDark),
                  _buildDayBtn(6, 'S', isDark),
                  _buildDayBtn(7, 'S', isDark),
                ],
              ),
              const SizedBox(height: 20),

              // Selected Activities
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Activities (${_selectedActivityIds.length} selected)',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  Text(
                    'Tap to toggle',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...allActivities.map((act) {
                final isSelected = _selectedActivityIds.contains(act.id);
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ModuleCard(
                    accentColor: isSelected ? AppColors.primaryTeal : null,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                          isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                          color: isSelected
                              ? AppColors.primaryTeal
                              : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
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
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimeChip(TimeOfDayCategory cat, String label, bool isDark) {
    final isSelected = _timeOfDay == cat;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _timeOfDay = cat),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
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

  Widget _buildDayBtn(int dayIndex, String label, bool isDark) {
    final isSelected = _selectedDays.contains(dayIndex);
    return InkWell(
      onTap: () {
        setState(() {
          if (isSelected) {
            _selectedDays.remove(dayIndex);
          } else {
            _selectedDays.add(dayIndex);
          }
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryTeal
              : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.primaryTeal : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
            ),
          ),
        ),
      ),
    );
  }
}
