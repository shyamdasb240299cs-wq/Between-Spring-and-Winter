enum MuscleGroup {
  chest,
  back,
  shoulders,
  arms,
  legs,
  core,
  fullBody;

  String get displayName {
    switch (this) {
      case MuscleGroup.chest:
        return 'Chest';
      case MuscleGroup.back:
        return 'Back';
      case MuscleGroup.shoulders:
        return 'Shoulders';
      case MuscleGroup.arms:
        return 'Arms';
      case MuscleGroup.legs:
        return 'Legs';
      case MuscleGroup.core:
        return 'Core';
      case MuscleGroup.fullBody:
        return 'Full Body';
    }
  }
}

enum EquipmentType {
  barbell,
  dumbbell,
  machine,
  cable,
  bodyweight,
  bands;

  String get displayName {
    switch (this) {
      case EquipmentType.barbell:
        return 'Barbell';
      case EquipmentType.dumbbell:
        return 'Dumbbell';
      case EquipmentType.machine:
        return 'Machine';
      case EquipmentType.cable:
        return 'Cable';
      case EquipmentType.bodyweight:
        return 'Bodyweight';
      case EquipmentType.bands:
        return 'Bands';
    }
  }
}

class GymExercise {
  final String id;
  final String name;
  final MuscleGroup primaryMuscle;
  final String secondaryMuscle;
  final EquipmentType equipment;
  final String instructions;
  final int defaultSets;
  final int defaultReps;
  final double defaultWeightKg;
  final bool isCustom;

  const GymExercise({
    required this.id,
    required this.name,
    required this.primaryMuscle,
    this.secondaryMuscle = '',
    required this.equipment,
    this.instructions = '',
    this.defaultSets = 3,
    this.defaultReps = 10,
    this.defaultWeightKg = 20.0,
    this.isCustom = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'primaryMuscle': primaryMuscle.name,
      'secondaryMuscle': secondaryMuscle,
      'equipment': equipment.name,
      'instructions': instructions,
      'defaultSets': defaultSets,
      'defaultReps': defaultReps,
      'defaultWeightKg': defaultWeightKg,
      'isCustom': isCustom,
    };
  }

  factory GymExercise.fromMap(Map<dynamic, dynamic> map) {
    return GymExercise(
      id: map['id'] as String? ?? '',
      name: map['name'] as String? ?? '',
      primaryMuscle: MuscleGroup.values.firstWhere(
        (e) => e.name == map['primaryMuscle'],
        orElse: () => MuscleGroup.chest,
      ),
      secondaryMuscle: map['secondaryMuscle'] as String? ?? '',
      equipment: EquipmentType.values.firstWhere(
        (e) => e.name == map['equipment'],
        orElse: () => EquipmentType.barbell,
      ),
      instructions: map['instructions'] as String? ?? '',
      defaultSets: (map['defaultSets'] as num?)?.toInt() ?? 3,
      defaultReps: (map['defaultReps'] as num?)?.toInt() ?? 10,
      defaultWeightKg: (map['defaultWeightKg'] as num?)?.toDouble() ?? 20.0,
      isCustom: map['isCustom'] as bool? ?? false,
    );
  }
}
