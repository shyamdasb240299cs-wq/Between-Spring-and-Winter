import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/activity.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/exercise_mode/presentation/exercise_runner_screen.dart';
import 'package:ascend/features/routines/state/routine_providers.dart';

class ActivityLibraryScreen extends ConsumerStatefulWidget {
  final bool isSelectionMode;
  final Function(Activity)? onActivitySelected;

  const ActivityLibraryScreen({
    super.key,
    this.isSelectionMode = false,
    this.onActivitySelected,
  });

  @override
  ConsumerState<ActivityLibraryScreen> createState() => _ActivityLibraryScreenState();
}

class _ActivityLibraryScreenState extends ConsumerState<ActivityLibraryScreen> {
  String _searchQuery = '';
  ActivityCategory? _selectedCategory;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allActivities = ref.watch(activitiesProvider);

    final filtered = allActivities.where((a) {
      final matchesQuery = a.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          a.targetArea.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCategory = _selectedCategory == null || a.category == _selectedCategory;
      return matchesQuery && matchesCategory;
    }).toList();

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Activity Library',
        subtitle: '${allActivities.length} posture & fitness movements',
        accentColor: AppColors.primaryTeal,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Create Custom Activity',
            onPressed: () => _showCreateActivityDialog(context),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search field
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: TextField(
                decoration: const InputDecoration(
                  hintText: 'Search chin tucks, wall angels, running...',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val.trim();
                  });
                },
              ),
            ),
            // Category filter chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  _buildFilterChip('All', _selectedCategory == null, () {
                    setState(() => _selectedCategory = null);
                  }, isDark),
                  const SizedBox(width: 8),
                  ...ActivityCategory.values.map((cat) {
                    final isSelected = _selectedCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _buildFilterChip(
                        cat.name.toUpperCase(),
                        isSelected,
                        () => setState(() => _selectedCategory = cat),
                        isDark,
                      ),
                    );
                  }),
                ],
              ),
            ),
            // Activities List
            Expanded(
              child: filtered.isEmpty
                  ? Center(
                      child: Text(
                        'No activities found.',
                        style: TextStyle(color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final act = filtered[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ModuleCard(
                            accentColor: act.category == ActivityCategory.posture
                                ? AppColors.primaryTeal
                                : act.category == ActivityCategory.cardio
                                    ? AppColors.infoBlue
                                    : AppColors.gymCoral,
                            padding: const EdgeInsets.all(14),
                            onTap: () {
                              if (widget.isSelectionMode) {
                                widget.onActivitySelected?.call(act);
                                Navigator.of(context).pop();
                              } else {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => ExerciseRunnerScreen(activity: act),
                                  ),
                                );
                              }
                            },
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryTeal.withAlpha(isDark ? 35 : 20),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    act.type == ActivityType.cardio
                                        ? Icons.directions_run
                                        : act.type == ActivityType.time
                                            ? Icons.timer
                                            : Icons.repeat,
                                    color: AppColors.primaryTeal,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        act.title,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        act.description,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Text(
                                            'Target: ${act.targetArea}',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: AppColors.primaryTealLight,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const Spacer(),
                                          Text(
                                            act.type == ActivityType.reps
                                                ? '${act.defaultSets} × ${act.defaultReps} reps'
                                                : '${act.defaultDurationSeconds ~/ 60} min',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                                            ),
                                          ),
                                        ],
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
              ? AppColors.primaryTeal
              : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primaryTeal : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
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

  void _showCreateActivityDialog(BuildContext context) {
    String title = '';
    String description = '';
    String targetArea = 'Postural Chain';
    ActivityType type = ActivityType.reps;
    ActivityCategory category = ActivityCategory.posture;
    int reps = 10;
    int sets = 3;
    int durationSecs = 60;

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
                    Text('New Activity', style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight),
                    const SizedBox(height: 16),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Activity Name (e.g. Thoracic Rotation)'),
                      onChanged: (v) => title = v,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Target Area (e.g. Scapula, Lower Spine)'),
                      onChanged: (v) => targetArea = v,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(labelText: 'Instructions / Description'),
                      onChanged: (v) => description = v,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<ActivityType>(
                            initialValue: type,
                            decoration: const InputDecoration(labelText: 'Type'),
                            items: ActivityType.values.map((t) => DropdownMenuItem(value: t, child: Text(t.name.toUpperCase()))).toList(),
                            onChanged: (v) => setModalState(() => type = v!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<ActivityCategory>(
                            initialValue: category,
                            decoration: const InputDecoration(labelText: 'Category'),
                            items: ActivityCategory.values.map((c) => DropdownMenuItem(value: c, child: Text(c.name.toUpperCase()))).toList(),
                            onChanged: (v) => setModalState(() => category = v!),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          if (title.trim().isEmpty) return;
                          final newAct = Activity(
                            id: const Uuid().v4(),
                            title: title.trim(),
                            description: description.trim(),
                            type: type,
                            category: category,
                            defaultReps: reps,
                            defaultSets: sets,
                            defaultDurationSeconds: durationSecs,
                            targetArea: targetArea.trim(),
                            isCustom: true,
                          );
                          ref.read(activitiesProvider.notifier).addOrUpdateActivity(newAct);
                          Navigator.of(ctx).pop();
                        },
                        child: const Text('Save Activity'),
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
