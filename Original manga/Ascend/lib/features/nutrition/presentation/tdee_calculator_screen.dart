import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/user_profile.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/settings/state/settings_providers.dart';

class TDEECalculatorScreen extends ConsumerStatefulWidget {
  const TDEECalculatorScreen({super.key});

  @override
  ConsumerState<TDEECalculatorScreen> createState() => _TDEECalculatorScreenState();
}

class _TDEECalculatorScreenState extends ConsumerState<TDEECalculatorScreen> {
  late FitnessGoal _goal;
  late ActivityLevel _activityLevel;
  late double _weight;
  late double _height;
  late int _age;
  late Gender _gender;

  @override
  void initState() {
    super.initState();
    final p = ref.read(userProfileProvider);
    _goal = p.goal;
    _activityLevel = p.activityLevel;
    _weight = p.weightKg;
    _height = p.heightCm;
    _age = p.age;
    _gender = p.gender;
  }

  void _save() {
    final current = ref.read(userProfileProvider);
    final updated = current.copyWith(
      goal: _goal,
      activityLevel: _activityLevel,
      weightKg: _weight,
      heightCm: _height,
      age: _age,
      gender: _gender,
    );

    ref.read(userProfileProvider.notifier).updateProfile(updated);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('TDEE & Calorie targets updated!')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Compute live preview profile
    final preview = UserProfile(
      name: 'Athlete',
      age: _age,
      gender: _gender,
      heightCm: _height,
      weightKg: _weight,
      activityLevel: _activityLevel,
      goal: _goal,
    );

    return Scaffold(
      appBar: CustomAppBar(
        title: 'TDEE & Energy Needs',
        subtitle: 'Mifflin-St Jeor Energy Formula',
        accentColor: AppColors.nutritionAmber,
        actions: [
          TextButton(
            onPressed: _save,
            child: const Text('Save', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.nutritionAmber)),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Result Card
              ModuleCard(
                accentColor: AppColors.nutritionAmber,
                padding: const EdgeInsets.all(20),
                hasGlow: true,
                child: Column(
                  children: [
                    const Text(
                      'DAILY TARGET CALORIES',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.4,
                        color: AppColors.nutritionAmber,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${preview.targetCalories.round()} kcal',
                      style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'BMR: ${preview.bmr.round()} kcal • Maintenance TDEE: ${preview.tdee.round()} kcal',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Goal selector
              Text('Nutritional Goal / Mode', style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight),
              const SizedBox(height: 10),

              Row(
                children: FitnessGoal.values.map((g) {
                  final isSel = _goal == g;
                  return Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: g != FitnessGoal.bulk ? 8 : 0),
                      child: InkWell(
                        onTap: () => setState(() => _goal = g),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: isSel
                                ? AppColors.nutritionAmber.withAlpha(isDark ? 40 : 25)
                                : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSel ? AppColors.nutritionAmber : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                              width: isSel ? 1.5 : 1.0,
                            ),
                          ),
                          child: Column(
                            children: [
                              Text(
                                g.displayName,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: isSel ? AppColors.nutritionAmber : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                g == FitnessGoal.cut ? '-400 kcal' : (g == FitnessGoal.maintain ? '+0 kcal' : '+300 kcal'),
                                style: const TextStyle(fontSize: 10, color: AppColors.darkTextMuted),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Activity Level
              Text('Weekly Activity Level', style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight),
              const SizedBox(height: 10),

              ...ActivityLevel.values.map((lvl) {
                final isSel = _activityLevel == lvl;
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ModuleCard(
                    accentColor: isSel ? AppColors.nutritionAmber : null,
                    padding: const EdgeInsets.all(12),
                    onTap: () => setState(() => _activityLevel = lvl),
                    child: Row(
                      children: [
                        Icon(
                          isSel ? Icons.radio_button_checked : Icons.radio_button_off,
                          color: isSel ? AppColors.nutritionAmber : AppColors.darkTextMuted,
                        ),
                        const SizedBox(width: 12),
                        Text(lvl.displayName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
