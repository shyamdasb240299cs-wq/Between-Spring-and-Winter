import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/daily_note.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/empty_state_view.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/notes/state/notes_providers.dart';

class JournalScreen extends ConsumerWidget {
  const JournalScreen({super.key});

  void _showAddNoteDialog(BuildContext context, WidgetRef ref, {DailyNote? existingNote}) {
    final textController = TextEditingController(text: existingNote?.content ?? '');
    final tagController = TextEditingController(text: existingNote?.tags.join(', ') ?? 'Posture, Energy');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
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
                Text(
                  existingNote == null ? 'New Daily Reflection' : 'Edit Reflection',
                  style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: textController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Notes / Thoughts',
                    hintText: 'e.g. Shoulders felt more relaxed today. Bench felt strong.',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: tagController,
                  decoration: const InputDecoration(
                    labelText: 'Tags (comma separated)',
                    hintText: 'Posture, Bench PR, Energy',
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.progressIndigo),
                    onPressed: () {
                      if (textController.text.trim().isEmpty) return;
                      final tags = tagController.text
                          .split(',')
                          .map((t) => t.trim())
                          .where((t) => t.isNotEmpty)
                          .toList();

                      final note = DailyNote(
                        id: existingNote?.id ?? const Uuid().v4(),
                        dateString: DateFormatters.toIsoDate(DateTime.now()),
                        content: textController.text.trim(),
                        tags: tags,
                        updatedAt: DateTime.now(),
                      );

                      ref.read(dailyNotesProvider.notifier).saveNote(note);
                      Navigator.of(ctx).pop();
                    },
                    child: const Text('Save Note', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final notes = ref.watch(dailyNotesProvider);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Health & Training Journal',
        subtitle: 'Reflections, mind-muscle cues & logs',
        accentColor: AppColors.progressIndigo,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Write Note',
            onPressed: () => _showAddNoteDialog(context, ref),
          ),
        ],
      ),
      body: SafeArea(
        child: notes.isEmpty
            ? EmptyStateView(
                icon: Icons.edit_note,
                title: 'No Journal Entries',
                message: 'Record how your body, posture, and strength feel after training.',
                actionLabel: 'Write First Note',
                onAction: () => _showAddNoteDialog(context, ref),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: notes.length,
                itemBuilder: (context, index) {
                  final note = notes[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ModuleCard(
                      accentColor: AppColors.progressIndigo,
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                DateFormatters.formatFullDate(note.updatedAt),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.progressIndigo),
                              ),
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.edit, size: 16),
                                    onPressed: () => _showAddNoteDialog(context, ref, existingNote: note),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.errorRed),
                                    onPressed: () {
                                      ref.read(dailyNotesProvider.notifier).deleteNote(note.id);
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '"${note.content}"',
                            style: isDark ? AppTypography.bodyMediumDark : AppTypography.bodyMediumLight,
                          ),
                          if (note.tags.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: note.tags.map((tag) {
                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.progressIndigo.withAlpha(isDark ? 35 : 20),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '#$tag',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.progressIndigo),
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
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
