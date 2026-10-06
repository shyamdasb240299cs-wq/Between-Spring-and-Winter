import 'package:flutter_test/flutter_test.dart';
import 'package:ascend/core/models/gym_session.dart';
import 'package:ascend/core/models/user_profile.dart';
import 'package:ascend/core/utils/fitness_calculators.dart';

void main() {
  group('FitnessCalculators & Formulas Tests', () {
    test('Mifflin-St Jeor BMR calculation for Male', () {
      // Men: 10 * 70 + 6.25 * 175 - 5 * 25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75
      const profile = UserProfile(
        name: 'Test Man',
        age: 25,
        gender: Gender.male,
        heightCm: 175.0,
        weightKg: 70.0,
        activityLevel: ActivityLevel.sedentary,
        goal: FitnessGoal.maintain,
      );

      expect(profile.bmr, closeTo(1673.75, 0.1));
      expect(profile.tdee, closeTo(1673.75 * 1.2, 0.1));
      expect(profile.targetCalories, closeTo(profile.tdee, 0.1));
    });

    test('Mifflin-St Jeor BMR calculation for Female with Cut deficit', () {
      // Women: 10 * 60 + 6.25 * 165 - 5 * 28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25
      const profile = UserProfile(
        name: 'Test Woman',
        age: 28,
        gender: Gender.female,
        heightCm: 165.0,
        weightKg: 60.0,
        activityLevel: ActivityLevel.moderatelyActive, // 1.55
        goal: FitnessGoal.cut, // -400 kcal
      );

      expect(profile.bmr, closeTo(1330.25, 0.1));
      final expectedTdee = 1330.25 * 1.55;
      expect(profile.tdee, closeTo(expectedTdee, 0.1));
      expect(profile.targetCalories, closeTo(expectedTdee - 400.0, 0.1));
    });

    test('Epley 1RM Formula Calculation', () {
      // Epley: 100 kg * (1 + 10 / 30) = 100 * (1 + 0.3333) = 133.33 kg
      final calculated1RM = FitnessCalculators.calculate1RM(100.0, 10);
      expect(calculated1RM, closeTo(133.33, 0.1));

      // 1 rep should equal exact weight
      expect(FitnessCalculators.calculate1RM(120.0, 1), equals(120.0));
      expect(FitnessCalculators.calculate1RM(0.0, 0), equals(0.0));
    });

    test('Gym Set Volume and Session Volume Calculation', () {
      const set1 = GymSetLog(
        id: 's1',
        exerciseId: 'ex1',
        exerciseName: 'Bench Press',
        setNumber: 1,
        weightKg: 80.0,
        reps: 8,
        isCompleted: true,
      );

      const set2 = GymSetLog(
        id: 's2',
        exerciseId: 'ex1',
        exerciseName: 'Bench Press',
        setNumber: 2,
        weightKg: 85.0,
        reps: 6,
        isCompleted: true,
      );

      const uncompletedSet = GymSetLog(
        id: 's3',
        exerciseId: 'ex1',
        exerciseName: 'Bench Press',
        setNumber: 3,
        weightKg: 90.0,
        reps: 4,
        isCompleted: false,
      );

      expect(set1.volume, equals(640.0));
      expect(set2.volume, equals(510.0));
      expect(uncompletedSet.volume, equals(0.0));

      final total = FitnessCalculators.calculateTotalVolume([set1, set2, uncompletedSet]);
      expect(total, equals(1150.0));
    });
  });
}
