class ExerciseLog {
  final String id;
  final String activityId;
  final String activityTitle;
  final String category;
  final DateTime timestamp;
  final int setsCompleted;
  final int repsCompleted;
  final int durationSeconds;
  final double distanceKm;
  final double caloriesBurned;
  final String notes;

  const ExerciseLog({
    required this.id,
    required this.activityId,
    required this.activityTitle,
    required this.category,
    required this.timestamp,
    this.setsCompleted = 0,
    this.repsCompleted = 0,
    this.durationSeconds = 0,
    this.distanceKm = 0.0,
    this.caloriesBurned = 0.0,
    this.notes = '',
  });

  String get paceFormatted {
    if (distanceKm <= 0 || durationSeconds <= 0) return '0:00 /km';
    final paceSeconds = (durationSeconds / distanceKm).round();
    final minutes = paceSeconds ~/ 60;
    final seconds = paceSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')} /km';
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'activityId': activityId,
      'activityTitle': activityTitle,
      'category': category,
      'timestamp': timestamp.toIso8601String(),
      'setsCompleted': setsCompleted,
      'repsCompleted': repsCompleted,
      'durationSeconds': durationSeconds,
      'distanceKm': distanceKm,
      'caloriesBurned': caloriesBurned,
      'notes': notes,
    };
  }

  factory ExerciseLog.fromMap(Map<dynamic, dynamic> map) {
    return ExerciseLog(
      id: map['id'] as String? ?? '',
      activityId: map['activityId'] as String? ?? '',
      activityTitle: map['activityTitle'] as String? ?? '',
      category: map['category'] as String? ?? 'posture',
      timestamp: map['timestamp'] != null
          ? DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      setsCompleted: (map['setsCompleted'] as num?)?.toInt() ?? 0,
      repsCompleted: (map['repsCompleted'] as num?)?.toInt() ?? 0,
      durationSeconds: (map['durationSeconds'] as num?)?.toInt() ?? 0,
      distanceKm: (map['distanceKm'] as num?)?.toDouble() ?? 0.0,
      caloriesBurned: (map['caloriesBurned'] as num?)?.toDouble() ?? 0.0,
      notes: map['notes'] as String? ?? '',
    );
  }
}
