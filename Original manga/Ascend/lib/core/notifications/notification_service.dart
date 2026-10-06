import 'package:flutter/foundation.dart';

class NotificationService {
  static final NotificationService instance = NotificationService._internal();
  NotificationService._internal();

  bool _isInitialized = false;

  Future<void> init() async {
    if (_isInitialized) return;
    try {
      _isInitialized = true;
      debugPrint('NotificationService: Initialized.');
    } catch (e) {
      debugPrint('NotificationService error: $e');
    }
  }

  Future<void> scheduleRoutineReminder({
    required int id,
    required String title,
    required String body,
    required String timeStr, // e.g. "07:00"
    List<int> daysOfWeek = const [],
  }) async {
    debugPrint('Scheduled reminder #$id: $title ($timeStr)');
  }

  Future<void> schedulePostureBreakNudge({
    required int intervalMinutes,
  }) async {
    debugPrint('Scheduled posture break nudge every $intervalMinutes minutes.');
  }

  Future<void> cancelReminder(int id) async {
    debugPrint('Cancelled reminder #$id');
  }
}
