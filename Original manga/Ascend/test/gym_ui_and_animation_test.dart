import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:ascend/core/database/database_keys.dart';
import 'package:ascend/core/database/hive_service.dart';
import 'package:ascend/core/models/gym_exercise.dart';
import 'package:ascend/core/models/gym_workout_template.dart';
import 'package:ascend/features/gym/presentation/exercise_detail_screen.dart';
import 'package:ascend/features/gym/presentation/gym_home_screen.dart';
import 'package:ascend/features/gym/presentation/widgets/exercise_animation_widget.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory tempDir;

  setUpAll(() async {
    tempDir = await Directory.systemTemp.createTemp('ascend_ui_test_');
    Hive.init(tempDir.path);

    HiveService.instance.activitiesBox = await Hive.openBox(DatabaseKeys.activitiesBox);
    HiveService.instance.routinesBox = await Hive.openBox(DatabaseKeys.routinesBox);
    HiveService.instance.exerciseLogsBox = await Hive.openBox(DatabaseKeys.exerciseLogsBox);
    HiveService.instance.gymExercisesBox = await Hive.openBox(DatabaseKeys.gymExercisesBox);
    HiveService.instance.gymTemplatesBox = await Hive.openBox(DatabaseKeys.gymTemplatesBox);
    HiveService.instance.gymSessionsBox = await Hive.openBox(DatabaseKeys.gymSessionsBox);
    HiveService.instance.nutritionEntriesBox = await Hive.openBox(DatabaseKeys.nutritionEntriesBox);
    HiveService.instance.userProfileBox = await Hive.openBox(DatabaseKeys.userProfileBox);
    HiveService.instance.progressPhotosBox = await Hive.openBox(DatabaseKeys.progressPhotosBox);
    HiveService.instance.bodyMetricsBox = await Hive.openBox(DatabaseKeys.bodyMetricsBox);
    HiveService.instance.postureCheckinsBox = await Hive.openBox(DatabaseKeys.postureCheckinsBox);
    HiveService.instance.achievementsBox = await Hive.openBox(DatabaseKeys.achievementsBox);
    HiveService.instance.dailyNotesBox = await Hive.openBox(DatabaseKeys.dailyNotesBox);
    HiveService.instance.waterLogsBox = await Hive.openBox(DatabaseKeys.waterLogsBox);
    HiveService.instance.settingsBox = await Hive.openBox(DatabaseKeys.settingsBox);

    // Seed test template
    const testTemplate = GymWorkoutTemplate(
      id: 'tpl_split_legs',
      name: 'Day 1 — Legs & Lower Body (Tue)',
      description: 'Quad hypertrophy & heavy squats',
      exerciseIds: ['gym_barbell_squat'],
      splitCategory: 'Legs',
    );
    await HiveService.instance.gymTemplatesBox.put(testTemplate.id, testTemplate.toMap());
  });

  tearDownAll(() async {
    await Hive.close();
    if (tempDir.existsSync()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('Exercise Animation & Motion Type Tests', () {
    test('Correctly maps exercises to specific motion categories', () {
      const legRaises = GymExercise(
        id: 'gym_hanging_leg_raises',
        name: 'Hanging Leg Raises',
        primaryMuscle: MuscleGroup.core,
        equipment: EquipmentType.bodyweight,
      );
      expect(ExerciseAnimationWidget.getMotionType(legRaises), ExerciseMotionType.legRaises);

      const squat = GymExercise(
        id: 'gym_barbell_squat',
        name: 'Barbell Back Squat',
        primaryMuscle: MuscleGroup.legs,
        equipment: EquipmentType.barbell,
      );
      expect(ExerciseAnimationWidget.getMotionType(squat), ExerciseMotionType.squat);

      const bench = GymExercise(
        id: 'gym_bench_press',
        name: 'Barbell Bench Press',
        primaryMuscle: MuscleGroup.chest,
        equipment: EquipmentType.barbell,
      );
      expect(ExerciseAnimationWidget.getMotionType(bench), ExerciseMotionType.benchPress);

      const deadlift = GymExercise(
        id: 'gym_barbell_deadlift',
        name: 'Conventional Deadlift',
        primaryMuscle: MuscleGroup.back,
        equipment: EquipmentType.barbell,
      );
      expect(ExerciseAnimationWidget.getMotionType(deadlift), ExerciseMotionType.deadlift);

      const curls = GymExercise(
        id: 'gym_hammer_curls',
        name: 'Dumbbell Hammer Curls',
        primaryMuscle: MuscleGroup.arms,
        equipment: EquipmentType.dumbbell,
      );
      expect(ExerciseAnimationWidget.getMotionType(curls), ExerciseMotionType.bicepCurl);

      const triceps = GymExercise(
        id: 'gym_tricep_rope_pushdown',
        name: 'Cable Tricep Rope Pushdown',
        primaryMuscle: MuscleGroup.arms,
        equipment: EquipmentType.cable,
      );
      expect(ExerciseAnimationWidget.getMotionType(triceps), ExerciseMotionType.tricepExtension);

      const ohp = GymExercise(
        id: 'gym_overhead_press',
        name: 'Overhead Barbell Press',
        primaryMuscle: MuscleGroup.shoulders,
        equipment: EquipmentType.barbell,
      );
      expect(ExerciseAnimationWidget.getMotionType(ohp), ExerciseMotionType.overheadPress);

      const plank = GymExercise(
        id: 'gym_plank_weighted',
        name: 'Isometric Plank',
        primaryMuscle: MuscleGroup.core,
        equipment: EquipmentType.bodyweight,
      );
      expect(ExerciseAnimationWidget.getMotionType(plank), ExerciseMotionType.plankCore);
    });

    testWidgets('ExerciseAnimationWidget mounts, animates and responds to pause/play', (tester) async {
      const testEx = GymExercise(
        id: 'gym_hanging_leg_raises',
        name: 'Hanging Leg Raises',
        primaryMuscle: MuscleGroup.core,
        secondaryMuscle: 'Lower Abs, Hip Flexors',
        equipment: EquipmentType.bodyweight,
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ExerciseAnimationWidget(exercise: testEx),
          ),
        ),
      );

      // Verify widget elements render
      expect(find.byType(ExerciseAnimationWidget), findsOneWidget);
      expect(find.text('Core'), findsOneWidget);
      expect(find.text('Lower Abs'), findsOneWidget);
      expect(find.byIcon(Icons.pause_rounded), findsOneWidget);

      // Tap pause button
      await tester.tap(find.byIcon(Icons.pause_rounded));
      await tester.pump();
      expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);

      // Tap play button
      await tester.tap(find.byIcon(Icons.play_arrow_rounded));
      await tester.pump();
      expect(find.byIcon(Icons.pause_rounded), findsOneWidget);

      // Tap speed selector
      expect(find.text('1.0x'), findsOneWidget);
      await tester.tap(find.text('1.0x'));
      await tester.pump();
      expect(find.text('1.5x'), findsOneWidget);
    });
  });

  group('Gym Screen UI & Layout Overflow Tests', () {
    testWidgets('GymHomeScreen renders properly with no layout overflow on compact and standard screens', (tester) async {
      // Set compact screen dimensions (360 x 640)
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: GymHomeScreen(),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      // Verify app bar and primary cards render
      expect(find.text('Gym & Strength'), findsOneWidget);
      expect(find.text('Weekly Volume Progression'), findsOneWidget);
      expect(find.text('Start Free-Form Session'), findsOneWidget);
      expect(find.text('5-Day Split Routines'), findsOneWidget);

      // Verify weekly pills
      expect(find.text('Mon'), findsOneWidget);
      expect(find.text('Tue'), findsOneWidget);
      expect(find.text('Wed'), findsOneWidget);
      expect(find.text('Thu'), findsOneWidget);
      expect(find.text('Fri'), findsOneWidget);
      expect(find.text('Sat'), findsOneWidget);
      expect(find.text('Sun'), findsOneWidget);
    });

    testWidgets('ExerciseDetailScreen renders animation and PR details cleanly', (tester) async {
      const testEx = GymExercise(
        id: 'gym_barbell_squat',
        name: 'Barbell Back Squat',
        primaryMuscle: MuscleGroup.legs,
        secondaryMuscle: 'Glutes, Core',
        equipment: EquipmentType.barbell,
        instructions: 'Squat to parallel and drive up.',
      );

      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: ExerciseDetailScreen(exercise: testEx),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Barbell Back Squat'), findsOneWidget);
      expect(find.byType(ExerciseAnimationWidget), findsOneWidget);
      expect(find.text('ALL-TIME PERSONAL RECORD'), findsOneWidget);
      expect(find.text('Estimated 1RM Progression Curve'), findsOneWidget);
    });
  });
}
