enum MealType {
  breakfast,
  lunch,
  dinner,
  snack;

  String get displayName {
    switch (this) {
      case MealType.breakfast:
        return 'Breakfast';
      case MealType.lunch:
        return 'Lunch';
      case MealType.dinner:
        return 'Dinner';
      case MealType.snack:
        return 'Snack';
    }
  }
}

class NutritionEntry {
  final String id;
  final String name;
  final MealType mealType;
  final double calories;
  final double proteinGrams;
  final double carbsGrams;
  final double fatGrams;
  final DateTime timestamp;
  final bool isFavorite;

  const NutritionEntry({
    required this.id,
    required this.name,
    required this.mealType,
    required this.calories,
    required this.proteinGrams,
    required this.carbsGrams,
    required this.fatGrams,
    required this.timestamp,
    this.isFavorite = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'mealType': mealType.name,
      'calories': calories,
      'proteinGrams': proteinGrams,
      'carbsGrams': carbsGrams,
      'fatGrams': fatGrams,
      'timestamp': timestamp.toIso8601String(),
      'isFavorite': isFavorite,
    };
  }

  factory NutritionEntry.fromMap(Map<dynamic, dynamic> map) {
    return NutritionEntry(
      id: map['id'] as String? ?? '',
      name: map['name'] as String? ?? '',
      mealType: MealType.values.firstWhere(
        (e) => e.name == map['mealType'],
        orElse: () => MealType.breakfast,
      ),
      calories: (map['calories'] as num?)?.toDouble() ?? 0.0,
      proteinGrams: (map['proteinGrams'] as num?)?.toDouble() ?? 0.0,
      carbsGrams: (map['carbsGrams'] as num?)?.toDouble() ?? 0.0,
      fatGrams: (map['fatGrams'] as num?)?.toDouble() ?? 0.0,
      timestamp: map['timestamp'] != null
          ? DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isFavorite: map['isFavorite'] as bool? ?? false,
    );
  }

  NutritionEntry copyWith({
    String? id,
    String? name,
    MealType? mealType,
    double? calories,
    double? proteinGrams,
    double? carbsGrams,
    double? fatGrams,
    DateTime? timestamp,
    bool? isFavorite,
  }) {
    return NutritionEntry(
      id: id ?? this.id,
      name: name ?? this.name,
      mealType: mealType ?? this.mealType,
      calories: calories ?? this.calories,
      proteinGrams: proteinGrams ?? this.proteinGrams,
      carbsGrams: carbsGrams ?? this.carbsGrams,
      fatGrams: fatGrams ?? this.fatGrams,
      timestamp: timestamp ?? this.timestamp,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }
}
