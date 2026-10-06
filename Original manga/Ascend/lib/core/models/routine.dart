enum TimeOfDayCategory { morning, afternoon, evening, night }

class Routine {
  final String id;
  final String title;
  final String description;
  final List<String> activityIds;
  final TimeOfDayCategory timeOfDay;
  final List<int> daysOfWeek; // 1 = Monday, 7 = Sunday. Empty list means Every Day.
  final String? reminderTime; // e.g. "07:00" or "19:00"
  final bool isEnabled;
  final DateTime createdAt;

  const Routine({
    required this.id,
    required this.title,
    this.description = '',
    required this.activityIds,
    this.timeOfDay = TimeOfDayCategory.morning,
    this.daysOfWeek = const [],
    this.reminderTime,
    this.isEnabled = true,
    required this.createdAt,
  });

  bool isScheduledForDay(int weekday) {
    if (daysOfWeek.isEmpty) return true; // Daily
    return daysOfWeek.contains(weekday);
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'activityIds': activityIds,
      'timeOfDay': timeOfDay.name,
      'daysOfWeek': daysOfWeek,
      'reminderTime': reminderTime,
      'isEnabled': isEnabled,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory Routine.fromMap(Map<dynamic, dynamic> map) {
    return Routine(
      id: map['id'] as String? ?? '',
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      activityIds: (map['activityIds'] as List?)?.map((e) => e.toString()).toList() ?? [],
      timeOfDay: TimeOfDayCategory.values.firstWhere(
        (e) => e.name == map['timeOfDay'],
        orElse: () => TimeOfDayCategory.morning,
      ),
      daysOfWeek: (map['daysOfWeek'] as List?)?.map((e) => (e as num).toInt()).toList() ?? [],
      reminderTime: map['reminderTime'] as String?,
      isEnabled: map['isEnabled'] as bool? ?? true,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Routine copyWith({
    String? id,
    String? title,
    String? description,
    List<String>? activityIds,
    TimeOfDayCategory? timeOfDay,
    List<int>? daysOfWeek,
    String? reminderTime,
    bool? isEnabled,
    DateTime? createdAt,
  }) {
    return Routine(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      activityIds: activityIds ?? this.activityIds,
      timeOfDay: timeOfDay ?? this.timeOfDay,
      daysOfWeek: daysOfWeek ?? this.daysOfWeek,
      reminderTime: reminderTime ?? this.reminderTime,
      isEnabled: isEnabled ?? this.isEnabled,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
