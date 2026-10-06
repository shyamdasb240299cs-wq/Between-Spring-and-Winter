enum Gender { male, female, other }

enum ActivityLevel {
  sedentary, // Desk job, little exercise
  lightlyActive, // 1-3 days/week
  moderatelyActive, // 3-5 days/week
  veryActive, // 6-7 days/week
  extraActive; // Intense daily training

  String get displayName {
    switch (this) {
      case ActivityLevel.sedentary:
        return 'Sedentary (Little/no exercise)';
      case ActivityLevel.lightlyActive:
        return 'Lightly Active (1–3 days/week)';
      case ActivityLevel.moderatelyActive:
        return 'Moderately Active (3–5 days/week)';
      case ActivityLevel.veryActive:
        return 'Very Active (6–7 days/week)';
      case ActivityLevel.extraActive:
        return 'Extra Active (Physical job & training)';
    }
  }

  double get multiplier {
    switch (this) {
      case ActivityLevel.sedentary:
        return 1.2;
      case ActivityLevel.lightlyActive:
        return 1.375;
      case ActivityLevel.moderatelyActive:
        return 1.55;
      case ActivityLevel.veryActive:
        return 1.725;
      case ActivityLevel.extraActive:
        return 1.9;
    }
  }
}

enum FitnessGoal {
  cut, // Deficit (-400 kcal)
  maintain, // TDEE
  bulk; // Surplus (+300 kcal)

  String get displayName {
    switch (this) {
      case FitnessGoal.cut:
        return 'Fat Loss / Cut (Calorie Deficit)';
      case FitnessGoal.maintain:
        return 'Maintain & Recompose';
      case FitnessGoal.bulk:
        return 'Lean Muscle Gain / Bulk';
    }
  }

  double get calorieAdjustment {
    switch (this) {
      case FitnessGoal.cut:
        return -400.0;
      case FitnessGoal.maintain:
        return 0.0;
      case FitnessGoal.bulk:
        return 300.0;
    }
  }
}

class UserProfile {
  final String name;
  final int age;
  final Gender gender;
  final double heightCm;
  final double weightKg;
  final ActivityLevel activityLevel;
  final FitnessGoal goal;
  final double? customCalorieTarget;
  final double? customProteinGrams;
  final double? customCarbsGrams;
  final double? customFatGrams;
  final int waterGoalMl;
  final bool isOnboarded;

  const UserProfile({
    this.name = 'Athlete',
    this.age = 25,
    this.gender = Gender.male,
    this.heightCm = 175.0,
    this.weightKg = 70.0,
    this.activityLevel = ActivityLevel.moderatelyActive,
    this.goal = FitnessGoal.maintain,
    this.customCalorieTarget,
    this.customProteinGrams,
    this.customCarbsGrams,
    this.customFatGrams,
    this.waterGoalMl = 2500,
    this.isOnboarded = false,
  });

  // Mifflin-St Jeor Formula
  double get bmr {
    if (gender == Gender.female) {
      return (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    } else {
      return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    }
  }

  double get tdee => bmr * activityLevel.multiplier;

  double get targetCalories {
    if (customCalorieTarget != null && customCalorieTarget! > 500) {
      return customCalorieTarget!;
    }
    return (tdee + goal.calorieAdjustment).clamp(1200.0, 5000.0);
  }

  // Recommended default macro targets (40% carbs, 30% protein, 30% fat)
  double get targetProteinGrams {
    if (customProteinGrams != null && customProteinGrams! > 0) {
      return customProteinGrams!;
    }
    // ~2g per kg of bodyweight
    return (weightKg * 2.0).clamp(60.0, 300.0);
  }

  double get targetFatGrams {
    if (customFatGrams != null && customFatGrams! > 0) {
      return customFatGrams!;
    }
    // ~25% of calories from fat (9 kcal/g)
    return ((targetCalories * 0.25) / 9.0).clamp(30.0, 150.0);
  }

  double get targetCarbsGrams {
    if (customCarbsGrams != null && customCarbsGrams! > 0) {
      return customCarbsGrams!;
    }
    // Remaining calories from carbs (4 kcal/g)
    final proteinCalories = targetProteinGrams * 4.0;
    final fatCalories = targetFatGrams * 9.0;
    final remainingCalories = (targetCalories - proteinCalories - fatCalories).clamp(200.0, 4000.0);
    return remainingCalories / 4.0;
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'age': age,
      'gender': gender.name,
      'heightCm': heightCm,
      'weightKg': weightKg,
      'activityLevel': activityLevel.name,
      'goal': goal.name,
      'customCalorieTarget': customCalorieTarget,
      'customProteinGrams': customProteinGrams,
      'customCarbsGrams': customCarbsGrams,
      'customFatGrams': customFatGrams,
      'waterGoalMl': waterGoalMl,
      'isOnboarded': isOnboarded,
    };
  }

  factory UserProfile.fromMap(Map<dynamic, dynamic> map) {
    return UserProfile(
      name: map['name'] as String? ?? 'Athlete',
      age: (map['age'] as num?)?.toInt() ?? 25,
      gender: Gender.values.firstWhere(
        (e) => e.name == map['gender'],
        orElse: () => Gender.male,
      ),
      heightCm: (map['heightCm'] as num?)?.toDouble() ?? 175.0,
      weightKg: (map['weightKg'] as num?)?.toDouble() ?? 70.0,
      activityLevel: ActivityLevel.values.firstWhere(
        (e) => e.name == map['activityLevel'],
        orElse: () => ActivityLevel.moderatelyActive,
      ),
      goal: FitnessGoal.values.firstWhere(
        (e) => e.name == map['goal'],
        orElse: () => FitnessGoal.maintain,
      ),
      customCalorieTarget: (map['customCalorieTarget'] as num?)?.toDouble(),
      customProteinGrams: (map['customProteinGrams'] as num?)?.toDouble(),
      customCarbsGrams: (map['customCarbsGrams'] as num?)?.toDouble(),
      customFatGrams: (map['customFatGrams'] as num?)?.toDouble(),
      waterGoalMl: (map['waterGoalMl'] as num?)?.toInt() ?? 2500,
      isOnboarded: map['isOnboarded'] as bool? ?? false,
    );
  }

  UserProfile copyWith({
    String? name,
    int? age,
    Gender? gender,
    double? heightCm,
    double? weightKg,
    ActivityLevel? activityLevel,
    FitnessGoal? goal,
    double? customCalorieTarget,
    double? customProteinGrams,
    double? customCarbsGrams,
    double? customFatGrams,
    int? waterGoalMl,
    bool? isOnboarded,
  }) {
    return UserProfile(
      name: name ?? this.name,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      heightCm: heightCm ?? this.heightCm,
      weightKg: weightKg ?? this.weightKg,
      activityLevel: activityLevel ?? this.activityLevel,
      goal: goal ?? this.goal,
      customCalorieTarget: customCalorieTarget ?? this.customCalorieTarget,
      customProteinGrams: customProteinGrams ?? this.customProteinGrams,
      customCarbsGrams: customCarbsGrams ?? this.customCarbsGrams,
      customFatGrams: customFatGrams ?? this.customFatGrams,
      waterGoalMl: waterGoalMl ?? this.waterGoalMl,
      isOnboarded: isOnboarded ?? this.isOnboarded,
    );
  }
}
