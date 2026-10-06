import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/database/hive_service.dart';
import 'core/notifications/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Local Hive Persistence
  await HiveService.instance.init();

  // Initialize Local Notifications Service
  await NotificationService.instance.init();

  runApp(
    const ProviderScope(
      child: AscendApp(),
    ),
  );
}
