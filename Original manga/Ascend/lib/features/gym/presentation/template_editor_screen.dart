import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/models/gym_workout_template.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/gym/state/gym_history_providers.dart';
import 'exercise_library_screen.dart';

class TemplateEditorScreen extends ConsumerStatefulWidget {
  final GymWorkoutTemplate? initialTemplate;

  const TemplateEditorScreen({super.key, this.initialTemplate});

  @override
  ConsumerState<TemplateEditorScreen> createState() => _TemplateEditorScreenState();
}

class _TemplateEditorScreenState extends ConsumerState<TemplateEditorScreen> {
  late TextEditingController _nameController;
  late TextEditingController _descController;
  late List<String> _exerciseIds;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialTemplate?.name ?? '');
    _descController = TextEditingController(text: widget.initialTemplate?.description ?? '');
    _exerciseIds = widget.initialTemplate?.exerciseIds.toList() ?? [];
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _save() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a workout split name.')),
      );
      return;
    }

    if (_exerciseIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least 1 exercise.')),
      );
      return;
    }

    final tpl = GymWorkoutTemplate(
      id: widget.initialTemplate?.id ?? const Uuid().v4(),
      name: _nameController.text.trim(),
      description: _descController.text.trim(),
      exerciseIds: _exerciseIds,
      isCustom: true,
    );

    await ref.read(gymTemplatesProvider.notifier).addOrUpdateTemplate(tpl);
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allExercises = ref.watch(gymExercisesProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: widget.initialTemplate == null ? 'Create Split Template' : 'Edit Split',
        accentColor: AppColors.gymCoral,
        actions: [
          TextButton(
            onPressed: _save,
            child: const Text('Save', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.gymCoral)),
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
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Split / Routine Name',
                  hintText: 'e.g. Upper Body Hypertrophy',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _descController,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  hintText: 'e.g. Focus on deep stretch and strict pauses',
                ),
              ),
              const SizedBox(height: 24),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Exercises (${_exerciseIds.length})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.gymCoral,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => GymExerciseLibraryScreen(
                            isSelectionMode: true,
                            onExerciseSelected: (selectedEx) {
                              if (!_exerciseIds.contains(selectedEx.id)) {
                                setState(() {
                                  _exerciseIds.add(selectedEx.id);
                                });
                              }
                            },
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add Exercise'),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (_exerciseIds.isEmpty)
                ModuleCard(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'No exercises added yet. Tap "+ Add Exercise" to build your split.',
                      style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                    ),
                  ),
                )
              else
                ReorderableListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _exerciseIds.length,
                  onReorder: (oldIdx, newIdx) {
                    setState(() {
                      if (oldIdx < newIdx) newIdx -= 1;
                      final item = _exerciseIds.removeAt(oldIdx);
                      _exerciseIds.insert(newIdx, item);
                    });
                  },
                  itemBuilder: (context, index) {
                    final exId = _exerciseIds[index];
                    final ex = allExercises.firstWhere(
                      (e) => e.id == exId,
                      orElse: () => GymExercise(
                        id: exId,
                        name: 'Exercise',
                        primaryMuscle: MuscleGroup.chest,
                        equipment: EquipmentType.barbell,
                      ),
                    );

                    return Container(
                      key: ValueKey(exId),
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ModuleCard(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        child: Row(
                          children: [
                            const Icon(Icons.drag_handle, color: AppColors.darkTextMuted),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    ex.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  Text(
                                    '${ex.primaryMuscle.displayName} • ${ex.equipment.displayName}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppColors.errorRed, size: 20),
                              onPressed: () {
                                setState(() {
                                  _exerciseIds.removeAt(index);
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}
