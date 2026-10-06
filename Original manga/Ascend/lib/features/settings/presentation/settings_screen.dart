import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/database/hive_service.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/nutrition/presentation/tdee_calculator_screen.dart';
import 'package:ascend/features/settings/state/settings_providers.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeMode = ref.watch(themeModeProvider);
    final profile = ref.watch(userProfileProvider);

    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Settings & Profile',
        accentColor: AppColors.primaryTeal,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Profile Banner Card
              ModuleCard(
                accentColor: AppColors.primaryTeal,
                padding: const EdgeInsets.all(18),
                child: Row(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: const BoxDecoration(
                        gradient: AppColors.brandGradient,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Icon(Icons.person, color: Colors.white, size: 28),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            profile.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${profile.age} yrs • ${profile.weightKg} kg • ${profile.heightCm} cm',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                          Text(
                            profile.goal.displayName,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primaryTealLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Appearance Section
              Text('Appearance', style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight),
              const SizedBox(height: 10),

              ModuleCard(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(isDark ? Icons.dark_mode : Icons.light_mode, color: AppColors.primaryTeal),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Dark Theme Mode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            Text(
                              isDark ? 'Dark Mode (Active)' : 'Light Mode (Active)',
                              style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Switch(
                      value: themeMode == ThemeMode.dark,
                      activeThumbColor: AppColors.primaryTeal,
                      onChanged: (val) {
                        ref.read(themeModeProvider.notifier).toggleTheme();
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Health & Goals Section
              Text('Targets & Energy', style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight),
              const SizedBox(height: 10),

              ModuleCard(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const TDEECalculatorScreen()),
                  );
                },
                child: Row(
                  children: [
                    const Icon(Icons.calculate_outlined, color: AppColors.nutritionAmber),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('TDEE & Calorie Formula', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(
                            'Target: ${profile.targetCalories.round()} kcal • Goal: ${profile.goal.name.toUpperCase()}',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.darkTextMuted),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Data & Reset Section
              Text('Data & Storage', style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight),
              const SizedBox(height: 10),

              ModuleCard(
                child: Row(
                  children: [
                    const Icon(Icons.storage, color: AppColors.infoBlue),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Local-First Hive Database', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(
                            'All photos, workout logs & nutrition are kept offline.',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),

              ModuleCard(
                onTap: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Reset Sample Data?'),
                      content: const Text('This will reload fresh default workouts, posture routines, and starter history logs.'),
                      actions: [
                        TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorRed),
                          onPressed: () => Navigator.of(ctx).pop(true),
                          child: const Text('Reset'),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await HiveService.instance.clearAllData();
                    ref.read(userProfileProvider.notifier).loadProfile();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Database reset and re-seeded with demo data!')),
                      );
                    }
                  }
                },
                child: Row(
                  children: [
                    const Icon(Icons.refresh, color: AppColors.errorRed),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Reset / Seed Demo Data', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.errorRed)),
                          Text(
                            'Restore default workouts, routines, and achievements',
                            style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // App Version & Credits
              Center(
                child: Column(
                  children: [
                    Text(
                      'ASCEND v1.0.0',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Stand tall. Train hard. Track everything.',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
