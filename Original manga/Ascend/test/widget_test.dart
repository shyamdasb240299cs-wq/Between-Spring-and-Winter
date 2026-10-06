import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'package:ascend/app.dart';
import 'package:ascend/core/database/database_keys.dart';
import 'package:ascend/core/database/hive_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    final tempDir = await Directory.systemTemp.createTemp('hive_test_');
    Hive.init(tempDir.path);

    // Open boxes for testing without requiring native path_provider channel
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
  });

  tearDown(() async {
    await Hive.close();
  });

  testWidgets('AscendApp boots up and renders MaterialApp', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: AscendApp(),
      ),
    );

    // Initial frame
    await tester.pump();

    // Verify MaterialApp mounts properly
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
