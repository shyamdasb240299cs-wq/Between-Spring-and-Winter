enum GymSetType {
  warmup,
  working,
  dropset,
  failure;

  String get shortLabel {
    switch (this) {
      case GymSetType.warmup:
        return 'W';
      case GymSetType.working:
        return 'S';
      case GymSetType.dropset:
        return 'D';
      case GymSetType.failure:
        return 'F';
    }
  }

  String get displayName {
    switch (this) {
      case GymSetType.warmup:
        return 'Warm-up';
      case GymSetType.working:
        return 'Working Set';
      case GymSetType.dropset:
        return 'Drop Set';
      case GymSetType.failure:
        return 'To Failure';
    }
  }
}

class GymSetLog {
  final String id;
  final String exerciseId;
  final String exerciseName;
  final int setNumber;
  final double weightKg;
  final int reps;
  final GymSetType setType;
  final bool isCompleted;
  final double? rpe;
  final double? previousWeightKg;
  final int? previousReps;
  final bool isPR;

  const GymSetLog({
    required this.id,
    required this.exerciseId,
    required this.exerciseName,
    required this.setNumber,
    required this.weightKg,
    required this.reps,
    this.setType = GymSetType.working,
    this.isCompleted = false,
    this.rpe,
    this.previousWeightKg,
    this.previousReps,
    this.isPR = false,
  });

  double get volume => isCompleted ? (weightKg * reps) : 0.0;

  // Epley 1RM Formula: weight * (1 + reps / 30)
  double get estimated1RM {
    if (reps <= 0) return 0.0;
    if (reps == 1) return weightKg;
    return weightKg * (1 + (reps / 30.0));
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'exerciseId': exerciseId,
      'exerciseName': exerciseName,
      'setNumber': setNumber,
      'weightKg': weightKg,
      'reps': reps,
      'setType': setType.name,
      'isCompleted': isCompleted,
      'rpe': rpe,
      'previousWeightKg': previousWeightKg,
      'previousReps': previousReps,
      'isPR': isPR,
    };
  }

  factory GymSetLog.fromMap(Map<dynamic, dynamic> map) {
    return GymSetLog(
      id: map['id'] as String? ?? '',
      exerciseId: map['exerciseId'] as String? ?? '',
      exerciseName: map['exerciseName'] as String? ?? '',
      setNumber: (map['setNumber'] as num?)?.toInt() ?? 1,
      weightKg: (map['weightKg'] as num?)?.toDouble() ?? 0.0,
      reps: (map['reps'] as num?)?.toInt() ?? 0,
      setType: GymSetType.values.firstWhere(
        (e) => e.name == map['setType'],
        orElse: () => GymSetType.working,
      ),
      isCompleted: map['isCompleted'] as bool? ?? false,
      rpe: (map['rpe'] as num?)?.toDouble(),
      previousWeightKg: (map['previousWeightKg'] as num?)?.toDouble(),
      previousReps: (map['previousReps'] as num?)?.toInt(),
      isPR: map['isPR'] as bool? ?? false,
    );
  }

  GymSetLog copyWith({
    String? id,
    String? exerciseId,
    String? exerciseName,
    int? setNumber,
    double? weightKg,
    int? reps,
    GymSetType? setType,
    bool? isCompleted,
    double? rpe,
    double? previousWeightKg,
    int? previousReps,
    bool? isPR,
  }) {
    return GymSetLog(
      id: id ?? this.id,
      exerciseId: exerciseId ?? this.exerciseId,
      exerciseName: exerciseName ?? this.exerciseName,
      setNumber: setNumber ?? this.setNumber,
      weightKg: weightKg ?? this.weightKg,
      reps: reps ?? this.reps,
      setType: setType ?? this.setType,
      isCompleted: isCompleted ?? this.isCompleted,
      rpe: rpe ?? this.rpe,
      previousWeightKg: previousWeightKg ?? this.previousWeightKg,
      previousReps: previousReps ?? this.previousReps,
      isPR: isPR ?? this.isPR,
    );
  }
}

class GymSession {
  final String id;
  final String? templateId;
  final String templateName;
  final DateTime startTime;
  final DateTime? endTime;
  final List<GymSetLog> sets;
  final double totalVolumeKg;
  final String notes;
  final int prsHit;
  final double caloriesBurned;

  const GymSession({
    required this.id,
    this.templateId,
    required this.templateName,
    required this.startTime,
    this.endTime,
    required this.sets,
    this.totalVolumeKg = 0.0,
    this.notes = '',
    this.prsHit = 0,
    this.caloriesBurned = 0.0,
  });

  int get durationMinutes {
    if (endTime == null) return 0;
    return endTime!.difference(startTime).inMinutes;
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'templateId': templateId,
      'templateName': templateName,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'sets': sets.map((s) => s.toMap()).toList(),
      'totalVolumeKg': totalVolumeKg,
      'notes': notes,
      'prsHit': prsHit,
      'caloriesBurned': caloriesBurned,
    };
  }

  factory GymSession.fromMap(Map<dynamic, dynamic> map) {
    return GymSession(
      id: map['id'] as String? ?? '',
      templateId: map['templateId'] as String?,
      templateName: map['templateName'] as String? ?? 'Workout',
      startTime: map['startTime'] != null
          ? DateTime.tryParse(map['startTime'].toString()) ?? DateTime.now()
          : DateTime.now(),
      endTime: map['endTime'] != null ? DateTime.tryParse(map['endTime'].toString()) : null,
      sets: (map['sets'] as List?)
              ?.map((item) => GymSetLog.fromMap(item as Map<dynamic, dynamic>))
              .toList() ??
          [],
      totalVolumeKg: (map['totalVolumeKg'] as num?)?.toDouble() ?? 0.0,
      notes: map['notes'] as String? ?? '',
      prsHit: (map['prsHit'] as num?)?.toInt() ?? 0,
      caloriesBurned: (map['caloriesBurned'] as num?)?.toDouble() ?? 0.0,
    );
  }

  GymSession copyWith({
    String? id,
    String? templateId,
    String? templateName,
    DateTime? startTime,
    DateTime? endTime,
    List<GymSetLog>? sets,
    double? totalVolumeKg,
    String? notes,
    int? prsHit,
    double? caloriesBurned,
  }) {
    return GymSession(
      id: id ?? this.id,
      templateId: templateId ?? this.templateId,
      templateName: templateName ?? this.templateName,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      sets: sets ?? this.sets,
      totalVolumeKg: totalVolumeKg ?? this.totalVolumeKg,
      notes: notes ?? this.notes,
      prsHit: prsHit ?? this.prsHit,
      caloriesBurned: caloriesBurned ?? this.caloriesBurned,
    );
  }
}
