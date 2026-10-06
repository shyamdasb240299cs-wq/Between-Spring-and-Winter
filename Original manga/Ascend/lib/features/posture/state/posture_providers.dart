import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/database/hive_service.dart';
import '../../../core/models/posture_checkin.dart';

final postureCheckinsProvider = StateNotifierProvider<PostureCheckinsNotifier, List<PostureCheckin>>((ref) {
  return PostureCheckinsNotifier();
});

class PostureCheckinsNotifier extends StateNotifier<List<PostureCheckin>> {
  PostureCheckinsNotifier() : super([]) {
    loadCheckins();
  }

  void loadCheckins() {
    final box = HiveService.instance.postureCheckinsBox;
    final list = box.values.map((v) => PostureCheckin.fromMap(v)).toList();
    list.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    state = list;
  }

  Future<void> addCheckin(PostureCheckin checkin) async {
    await HiveService.instance.postureCheckinsBox.put(checkin.id, checkin.toMap());
    loadCheckins();
  }
}
