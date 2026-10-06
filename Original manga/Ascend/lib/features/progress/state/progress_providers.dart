import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/database/hive_service.dart';
import '../../../core/models/body_metric.dart';
import '../../../core/models/progress_photo.dart';

final progressPhotosProvider = StateNotifierProvider<ProgressPhotosNotifier, List<ProgressPhoto>>((ref) {
  return ProgressPhotosNotifier();
});

class ProgressPhotosNotifier extends StateNotifier<List<ProgressPhoto>> {
  ProgressPhotosNotifier() : super([]) {
    loadPhotos();
  }

  void loadPhotos() {
    final box = HiveService.instance.progressPhotosBox;
    final list = box.values.map((v) => ProgressPhoto.fromMap(v)).toList();
    list.sort((a, b) => b.date.compareTo(a.date));
    state = list;
  }

  Future<void> addPhoto(ProgressPhoto photo) async {
    await HiveService.instance.progressPhotosBox.put(photo.id, photo.toMap());
    loadPhotos();
  }

  Future<void> deletePhoto(String id) async {
    await HiveService.instance.progressPhotosBox.delete(id);
    loadPhotos();
  }
}

final bodyMetricsProvider = StateNotifierProvider<BodyMetricsNotifier, List<BodyMetric>>((ref) {
  return BodyMetricsNotifier();
});

class BodyMetricsNotifier extends StateNotifier<List<BodyMetric>> {
  BodyMetricsNotifier() : super([]) {
    loadMetrics();
  }

  void loadMetrics() {
    final box = HiveService.instance.bodyMetricsBox;
    final list = box.values.map((v) => BodyMetric.fromMap(v)).toList();
    list.sort((a, b) => a.date.compareTo(b.date));
    state = list;
  }

  Future<void> addMetric(BodyMetric metric) async {
    await HiveService.instance.bodyMetricsBox.put(metric.id, metric.toMap());
    loadMetrics();
  }

  Future<void> deleteMetric(String id) async {
    await HiveService.instance.bodyMetricsBox.delete(id);
    loadMetrics();
  }
}
