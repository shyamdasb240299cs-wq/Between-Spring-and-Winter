import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/gym/state/gym_history_providers.dart';
import 'exercise_detail_screen.dart';

class GymExerciseLibraryScreen extends ConsumerStatefulWidget {
  final bool isSelectionMode;
  final Function(GymExercise)? onExerciseSelected;

  const GymExerciseLibraryScreen({
    super.key,
    this.isSelectionMode = false,
    this.onExerciseSelected,
  });

  @override
  ConsumerState<GymExerciseLibraryScreen> createState() => _GymExerciseLibraryScreenState();
}

class _GymExerciseLibraryScreenState extends ConsumerState<GymExerciseLibraryScreen> {
  String _searchQuery = '';
  MuscleGroup? _selectedMuscle;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final all = ref.watch(gymExercisesProvider);

    final filtered = all.where((ex) {
      final matchesQuery = ex.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          ex.instructions.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesMuscle = _selectedMuscle == null || ex.primaryMuscle == _selectedMuscle;
      return matchesQuery && matchesMuscle;
    }).toList();

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Gym Exercises',
        subtitle: '${all.length} movements with PR tracking',
        accentColor: AppColors.gymCoral,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Add Custom Exercise',
            onPressed: () => _showAddExerciseDialog(context),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search Input
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: TextField(
                decoration: const InputDecoration(
                  hintText: 'Search Bench press, Barbell squat, Pull-ups...',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (v) => setState(() => _searchQuery = v.trim()),
              ),
            ),
            // Muscle Group Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  _buildFilterChip('All Muscles', _selectedMuscle == null, () {
                    setState(() => _selectedMuscle = null);
                  }, isDark),
                  const SizedBox(width: 8),
                  ...MuscleGroup.values.map((m) {
                    final isSel = _selectedMuscle == m;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _buildFilterChip(
                        m.displayName,
                        isSel,
                        () => setState(() => _selectedMuscle = m),
                        isDark,
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Exercise Cards List
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Text(
                        'No exercises found.',
                        style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final ex = filtered[index];
                        final prStats = ref.watch(exercisePRProvider(ex.id));

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ModuleCard(
                            accentColor: AppColors.gymCoral,
                            padding: const EdgeInsets.all(14),
                            onTap: () {
                              if (widget.isSelectionMode) {
                                widget.onExerciseSelected?.call(ex);
                                Navigator.of(context).pop();
                              } else {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ExerciseDetailScreen(exercise: ex),
                                  ),
                                );
                              }
                            },
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.gymCoral.withAlpha(isDark ? 35 : 20),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(Icons.fitness_center, color: AppColors.gymCoral, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        ex.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${ex.primaryMuscle.displayName} • ${ex.equipment.displayName}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                        ),
                                      ),
                                      if (prStats.maxWeight > 0) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          'PR: ${prStats.maxWeight} kg × ${prStats.maxReps} reps (1RM: ${prStats.max1RM.round()} kg)',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.gymCoral,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const Icon(Icons.chevron_right, color: AppColors.darkTextMuted),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap, bool isDark) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.gymCoral
              : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.gymCoral : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
          ),
        ),
      ),
    );
  }

  void _showAddExerciseDialog(BuildContext context) {
    String name = '';
    String instructions = '';
    MuscleGroup muscle = MuscleGroup.chest;
    EquipmentType equip = EquipmentType.barbell;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('New Gym Exercise', style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight),
                    const SizedBox(height: 16),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Exercise Name (e.g. Incline DB Press)'),
                      onChanged: (v) => name = v,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Form Cues / Instructions'),
                      onChanged: (v) => instructions = v,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<MuscleGroup>(
                            initialValue: muscle,
                            decoration: const InputDecoration(labelText: 'Muscle'),
                            items: MuscleGroup.values.map((m) => DropdownMenuItem(value: m, child: Text(m.displayName))).toList(),
                            onChanged: (v) => setModalState(() => muscle = v!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<EquipmentType>(
                            initialValue: equip,
                            decoration: const InputDecoration(labelText: 'Equipment'),
                            items: EquipmentType.values.map((e) => DropdownMenuItem(value: e, child: Text(e.displayName))).toList(),
                            onChanged: (v) => setModalState(() => equip = v!),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.gymCoral),
                        onPressed: () async {
                          if (name.trim().isEmpty) return;
                          final newEx = GymExercise(
                            id: const Uuid().v4(),
                            name: name.trim(),
                            primaryMuscle: muscle,
                            equipment: equip,
                            instructions: instructions.trim(),
                            isCustom: true,
                          );
                          await ref.read(gymExercisesProvider.notifier).addExercise(newEx);
                          if (ctx.mounted) Navigator.of(ctx).pop();
                        },
                        child: const Text('Save Exercise'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
