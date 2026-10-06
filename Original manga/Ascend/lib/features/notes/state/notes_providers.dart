import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/database/hive_service.dart';
import '../../../core/models/daily_note.dart';

final dailyNotesProvider = StateNotifierProvider<DailyNotesNotifier, List<DailyNote>>((ref) {
  return DailyNotesNotifier();
});

class DailyNotesNotifier extends StateNotifier<List<DailyNote>> {
  DailyNotesNotifier() : super([]) {
    loadNotes();
  }

  void loadNotes() {
    final box = HiveService.instance.dailyNotesBox;
    final list = box.values.map((v) => DailyNote.fromMap(v)).toList();
    list.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    state = list;
  }

  Future<void> saveNote(DailyNote note) async {
    await HiveService.instance.dailyNotesBox.put(note.id, note.toMap());
    loadNotes();
  }

  Future<void> deleteNote(String id) async {
    await HiveService.instance.dailyNotesBox.delete(id);
    loadNotes();
  }
}
