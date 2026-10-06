enum ActivityType { reps, time, cardio }

enum ActivityCategory { posture, mobility, cardio, strength, custom }

class Activity {
  final String id;
  final String title;
  final String description;
  final ActivityType type;
  final ActivityCategory category;
  final int defaultReps;
  final int defaultSets;
  final int defaultDurationSeconds;
  final String targetArea;
  final String iconName;
  final bool isCustom;

  const Activity({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.category,
    this.defaultReps = 10,
    this.defaultSets = 2,
    this.defaultDurationSeconds = 60,
    this.targetArea = 'General',
    this.iconName = 'accessibility_new',
    this.isCustom = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'type': type.name,
      'category': category.name,
      'defaultReps': defaultReps,
      'defaultSets': defaultSets,
      'defaultDurationSeconds': defaultDurationSeconds,
      'targetArea': targetArea,
      'iconName': iconName,
      'isCustom': isCustom,
    };
  }

  factory Activity.fromMap(Map<dynamic, dynamic> map) {
    return Activity(
      id: map['id'] as String? ?? '',
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      type: ActivityType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => ActivityType.reps,
      ),
      category: ActivityCategory.values.firstWhere(
        (e) => e.name == map['category'],
        orElse: () => ActivityCategory.posture,
      ),
      defaultReps: (map['defaultReps'] as num?)?.toInt() ?? 10,
      defaultSets: (map['defaultSets'] as num?)?.toInt() ?? 2,
      defaultDurationSeconds: (map['defaultDurationSeconds'] as num?)?.toInt() ?? 60,
      targetArea: map['targetArea'] as String? ?? 'General',
      iconName: map['iconName'] as String? ?? 'accessibility_new',
      isCustom: map['isCustom'] as bool? ?? false,
    );
  }

  Activity copyWith({
    String? id,
    String? title,
    String? description,
    ActivityType? type,
    ActivityCategory? category,
    int? defaultReps,
    int? defaultSets,
    int? defaultDurationSeconds,
    String? targetArea,
    String? iconName,
    bool? isCustom,
  }) {
    return Activity(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      type: type ?? this.type,
      category: category ?? this.category,
      defaultReps: defaultReps ?? this.defaultReps,
      defaultSets: defaultSets ?? this.defaultSets,
      defaultDurationSeconds: defaultDurationSeconds ?? this.defaultDurationSeconds,
      targetArea: targetArea ?? this.targetArea,
      iconName: iconName ?? this.iconName,
      isCustom: isCustom ?? this.isCustom,
    );
  }
}
