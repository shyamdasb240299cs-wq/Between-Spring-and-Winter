class GymWorkoutTemplate {
  final String id;
  final String name;
  final String description;
  final List<String> exerciseIds;
  final String splitCategory; // e.g. "Push", "Pull", "Legs", "Upper", "Lower", "Full Body"
  final bool isCustom;

  const GymWorkoutTemplate({
    required this.id,
    required this.name,
    this.description = '',
    required this.exerciseIds,
    this.splitCategory = 'General',
    this.isCustom = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'exerciseIds': exerciseIds,
      'splitCategory': splitCategory,
      'isCustom': isCustom,
    };
  }

  factory GymWorkoutTemplate.fromMap(Map<dynamic, dynamic> map) {
    return GymWorkoutTemplate(
      id: map['id'] as String? ?? '',
      name: map['name'] as String? ?? '',
      description: map['description'] as String? ?? '',
      exerciseIds: (map['exerciseIds'] as List?)?.map((e) => e.toString()).toList() ?? [],
      splitCategory: map['splitCategory'] as String? ?? 'General',
      isCustom: map['isCustom'] as bool? ?? false,
    );
  }

  GymWorkoutTemplate copyWith({
    String? id,
    String? name,
    String? description,
    List<String>? exerciseIds,
    String? splitCategory,
    bool? isCustom,
  }) {
    return GymWorkoutTemplate(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      exerciseIds: exerciseIds ?? this.exerciseIds,
      splitCategory: splitCategory ?? this.splitCategory,
      isCustom: isCustom ?? this.isCustom,
    );
  }
}
