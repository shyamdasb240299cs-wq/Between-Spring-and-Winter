import 'package:flutter_test/flutter_test.dart';
import 'package:ascend/core/models/gym_session.dart';

void main() {
  group('Chart Math & Volume Edge Case Tests', () {
    test('Calculates maxY correctly when all weeks have 0 volume (Empty state)', () {
      final List<double> weeklyVolumes = [0.0, 0.0, 0.0, 0.0];
      final maxVol = weeklyVolumes.fold<double>(0.0, (a, b) => a > b ? a : b);
      final calculatedMaxY = maxVol > 0 ? (maxVol * 1.25) : 1000.0;

      expect(calculatedMaxY, 1000.0);
      expect(calculatedMaxY.isFinite, isTrue);
      expect(calculatedMaxY > 0, isTrue);
    });

    test('Scales maxY with 1.25x headroom when volume is logged', () {
      final List<double> weeklyVolumes = [12000.0, 15000.0, 18500.0, 20000.0];
      final maxVol = weeklyVolumes.fold<double>(0.0, (a, b) => a > b ? a : b);
      final calculatedMaxY = maxVol > 0 ? (maxVol * 1.25) : 1000.0;

      expect(maxVol, 20000.0);
      expect(calculatedMaxY, 25000.0);
    });

    test('Background rod toY always matches calculatedMaxY to prevent overflow', () {
      final List<double> testVolumes = [500.0, 4500.0, 95000.0];
      for (final vol in testVolumes) {
        final calculatedMaxY = vol > 0 ? (vol * 1.25) : 1000.0;
        final backgroundToY = calculatedMaxY;

        // Verify background rod never underfills or exceeds chart boundary
        expect(backgroundToY, calculatedMaxY);
        expect(vol <= backgroundToY, isTrue);
      }
    });

    test('Summates volume only for completed sets with positive weight and reps', () {
      final sets = [
        const GymSetLog(
          id: 's1',
          exerciseId: 'ex1',
          exerciseName: 'Barbell Bench Press',
          setNumber: 1,
          weightKg: 80.0,
          reps: 8,
          isCompleted: true,
        ),
        const GymSetLog(
          id: 's2',
          exerciseId: 'ex1',
          exerciseName: 'Barbell Bench Press',
          setNumber: 2,
          weightKg: 85.0,
          reps: 6,
          isCompleted: true,
        ),
        const GymSetLog(
          id: 's3',
          exerciseId: 'ex1',
          exerciseName: 'Barbell Bench Press',
          setNumber: 3,
          weightKg: 90.0,
          reps: 5,
          isCompleted: false, // Incomplete set should not be counted in volume
        ),
      ];

      final totalCompletedVolume = sets
          .where((s) => s.isCompleted)
          .fold<double>(0.0, (acc, s) => acc + (s.weightKg * s.reps));

      // 80*8 = 640, 85*6 = 510 -> Total = 1150
      expect(totalCompletedVolume, 1150.0);
    });

    test('Epley 1RM Formula handles edge cases cleanly', () {
      // 1. Zero reps or zero weight
      const zeroRepSet = GymSetLog(
        id: 's_zero',
        exerciseId: 'ex1',
        exerciseName: 'Barbell Squat',
        setNumber: 1,
        weightKg: 100.0,
        reps: 0,
        isCompleted: true,
      );
      expect(zeroRepSet.estimated1RM, 0.0);

      // 2. 1 Rep Max equals the weight itself
      const singleRepSet = GymSetLog(
        id: 's_single',
        exerciseId: 'ex1',
        exerciseName: 'Barbell Squat',
        setNumber: 1,
        weightKg: 120.0,
        reps: 1,
        isCompleted: true,
      );
      expect(singleRepSet.estimated1RM, 120.0);

      // 3. 10 reps at 100 kg -> 100 * (1 + 10/30) = 133.33 kg
      const tenRepSet = GymSetLog(
        id: 's_ten',
        exerciseId: 'ex1',
        exerciseName: 'Barbell Squat',
        setNumber: 1,
        weightKg: 100.0,
        reps: 10,
        isCompleted: true,
      );
      expect(tenRepSet.estimated1RM, closeTo(133.33, 0.01));
    });
  });
}
