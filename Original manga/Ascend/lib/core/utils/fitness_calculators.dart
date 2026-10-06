import '../models/gym_session.dart';

class FitnessCalculators {
  FitnessCalculators._();

  /// Calculate Estimated 1-Rep Max using Epley formula: weight * (1 + reps / 30)
  static double calculate1RM(double weightKg, int reps) {
    if (reps <= 0 || weightKg <= 0) return 0.0;
    if (reps == 1) return weightKg;
    return weightKg * (1 + (reps / 30.0));
  }

  /// Calculate estimated calories burned for running based on weight and distance
  /// Standard approximation: ~1.036 kcal per kg of bodyweight per km
  static double calculateRunningCalories({
    required double weightKg,
    required double distanceKm,
  }) {
    if (distanceKm <= 0 || weightKg <= 0) return 0.0;
    return weightKg * distanceKm * 1.036;
  }

  /// Calculate estimated calories burned for walking (~0.75 kcal per kg per km)
  static double calculateWalkingCalories({
    required double weightKg,
    required double distanceKm,
  }) {
    if (distanceKm <= 0 || weightKg <= 0) return 0.0;
    return weightKg * distanceKm * 0.75;
  }

  /// Calculate estimated calories burned for cycling (~0.05 kcal per kg per minute * MET ~ 7)
  static double calculateCyclingCalories({
    required double weightKg,
    required int durationMinutes,
  }) {
    if (durationMinutes <= 0 || weightKg <= 0) return 0.0;
    return 7.0 * 3.5 * weightKg / 200.0 * durationMinutes;
  }

  /// Calculate gym session calories burned based on duration and volume (~5-6 kcal per min)
  static double calculateGymCalories({
    required int durationMinutes,
    required double totalVolumeKg,
  }) {
    if (durationMinutes <= 0) return 0.0;
    final baseKcal = durationMinutes * 5.5;
    final volumeBonus = (totalVolumeKg / 1000.0) * 8.0; // small volume workload bonus
    return (baseKcal + volumeBonus).clamp(20.0, 1500.0);
  }

  /// Calculate total training volume for a list of gym sets
  static double calculateTotalVolume(List<GymSetLog> sets) {
    double total = 0.0;
    for (final s in sets) {
      if (s.isCompleted) {
        total += s.weightKg * s.reps;
      }
    }
    return total;
  }
}
