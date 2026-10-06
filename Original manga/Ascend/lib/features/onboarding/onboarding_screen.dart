import 'package:flutter/material.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/database/database_keys.dart';
import 'package:ascend/core/database/hive_service.dart';
import 'package:ascend/core/models/user_profile.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/navigation/main_navigation_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  // Form Data
  String _name = 'Athlete';
  int _age = 25;
  Gender _gender = Gender.male;
  double _heightCm = 175.0;
  double _weightKg = 70.0;
  ActivityLevel _activityLevel = ActivityLevel.moderatelyActive;
  FitnessGoal _goal = FitnessGoal.cut;

  late UserProfile _currentCalculatedProfile;

  @override
  void initState() {
    super.initState();
    _updateCalculations();
  }

  void _updateCalculations() {
    _currentCalculatedProfile = UserProfile(
      name: _name,
      age: _age,
      gender: _gender,
      heightCm: _heightCm,
      weightKg: _weightKg,
      activityLevel: _activityLevel,
      goal: _goal,
      isOnboarded: true,
    );
  }

  void _nextPage() {
    if (_currentPage < 3) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _finishOnboarding();
    }
  }

  void _previousPage() {
    if (_currentPage > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _finishOnboarding() async {
    _updateCalculations();
    await HiveService.instance.userProfileBox.put(
      DatabaseKeys.userProfileKey,
      _currentCalculatedProfile.toMap(),
    );

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: SafeArea(
        child: Column(
          children: [
            // Top Step Progress Indicator
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                children: List.generate(4, (index) {
                  final isActive = index <= _currentPage;
                  return Expanded(
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(right: index < 3 ? 8 : 0),
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppColors.primaryTeal
                            : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (page) {
                  setState(() {
                    _currentPage = page;
                  });
                },
                children: [
                  _buildWelcomeStep(isDark),
                  _buildProfileStatsStep(isDark),
                  _buildGoalSelectionStep(isDark),
                  _buildTargetsSummaryStep(isDark),
                ],
              ),
            ),
            // Bottom Action Controls
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                children: [
                  if (_currentPage > 0)
                    OutlinedButton(
                      onPressed: _previousPage,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      ),
                      child: const Text('Back'),
                    ),
                  if (_currentPage > 0) const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _nextPage,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryTeal,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: Text(
                        _currentPage == 3 ? 'Get Started' : 'Continue',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomeStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: AppColors.brandGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.fitness_center, color: Colors.white, size: 40),
          ),
          const SizedBox(height: 24),
          Text(
            'Welcome to Ascend',
            style: isDark ? AppTypography.headingLargeDark : AppTypography.headingLargeLight,
          ),
          const SizedBox(height: 8),
          Text(
            'Your modular companion for posture correction, strength training, cardio endurance, and nutrition.',
            style: (isDark ? AppTypography.bodyLargeDark : AppTypography.bodyLargeLight)
                .copyWith(color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
          ),
          const SizedBox(height: 32),
          TextField(
            decoration: const InputDecoration(
              labelText: 'What should we call you?',
              prefixIcon: Icon(Icons.person_outline),
            ),
            onChanged: (val) {
              setState(() {
                _name = val.trim().isEmpty ? 'Athlete' : val.trim();
              });
            },
          ),
          const SizedBox(height: 24),
          Text(
            'Core Pillars of Ascend',
            style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
          ),
          const SizedBox(height: 12),
          _buildPillarTile(
            icon: Icons.accessibility_new,
            color: AppColors.primaryTeal,
            title: 'Posture & Mobility',
            desc: 'Counter desk posture, forward-head tilt, and pelvic misalignment.',
            isDark: isDark,
          ),
          const SizedBox(height: 10),
          _buildPillarTile(
            icon: Icons.fitness_center,
            color: AppColors.gymCoral,
            title: 'Gym & Strength',
            desc: 'Progressive overload tracking, set logging, 1RM, and volume.',
            isDark: isDark,
          ),
          const SizedBox(height: 10),
          _buildPillarTile(
            icon: Icons.restaurant_menu,
            color: AppColors.nutritionAmber,
            title: 'Calories & Macros',
            desc: 'TDEE calculation and flexible macro progress rings.',
            isDark: isDark,
          ),
          const SizedBox(height: 10),
          _buildPillarTile(
            icon: Icons.photo_camera,
            color: AppColors.progressIndigo,
            title: 'Visual Progress',
            desc: 'Side-by-side & slider comparisons with long-term body metrics.',
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildPillarTile({
    required IconData icon,
    required Color color,
    required String title,
    required String desc,
    required bool isDark,
  }) {
    return ModuleCard(
      accentColor: color,
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withAlpha(isDark ? 35 : 25),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileStatsStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Body Stats',
            style: isDark ? AppTypography.headingLargeDark : AppTypography.headingLargeLight,
          ),
          const SizedBox(height: 8),
          Text(
            'We use these metrics to accurately compute your BMR and baseline energy needs.',
            style: isDark ? AppTypography.bodyMediumDark : AppTypography.bodyMediumLight,
          ),
          const SizedBox(height: 24),
          // Gender Selector
          Row(
            children: [
              Expanded(
                child: _buildSelectCard(
                  label: 'Male',
                  isSelected: _gender == Gender.male,
                  color: AppColors.primaryTeal,
                  onTap: () => setState(() => _gender = Gender.male),
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSelectCard(
                  label: 'Female',
                  isSelected: _gender == Gender.female,
                  color: AppColors.primaryTeal,
                  onTap: () => setState(() => _gender = Gender.female),
                  isDark: isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Age & Weight & Height
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Age (years)', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    TextFormField(
                      initialValue: _age.toString(),
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(suffixText: 'yrs'),
                      onChanged: (val) {
                        setState(() {
                          _age = int.tryParse(val) ?? _age;
                        });
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Weight (kg)', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    TextFormField(
                      initialValue: _weightKg.toString(),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(suffixText: 'kg'),
                      onChanged: (val) {
                        setState(() {
                          _weightKg = double.tryParse(val) ?? _weightKg;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Height (cm)', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              TextFormField(
                initialValue: _heightCm.toString(),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(suffixText: 'cm'),
                onChanged: (val) {
                  setState(() {
                    _heightCm = double.tryParse(val) ?? _heightCm;
                  });
                },
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Text('Weekly Activity Level', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 10),
          ...ActivityLevel.values.map((lvl) {
            final isSelected = _activityLevel == lvl;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: _buildSelectCard(
                label: lvl.displayName,
                isSelected: isSelected,
                color: AppColors.nutritionAmber,
                onTap: () => setState(() => _activityLevel = lvl),
                isDark: isDark,
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildGoalSelectionStep(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Primary Focus',
            style: isDark ? AppTypography.headingLargeDark : AppTypography.headingLargeLight,
          ),
          const SizedBox(height: 8),
          Text(
            'Choose your current nutritional and body composition trajectory.',
            style: isDark ? AppTypography.bodyMediumDark : AppTypography.bodyMediumLight,
          ),
          const SizedBox(height: 24),
          ...FitnessGoal.values.map((g) {
            final isSelected = _goal == g;
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              child: ModuleCard(
                accentColor: isSelected ? AppColors.gymCoral : null,
                onTap: () {
                  setState(() {
                    _goal = g;
                    _updateCalculations();
                  });
                },
                child: Row(
                  children: [
                    Icon(
                      isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                      color: isSelected ? AppColors.gymCoral : (isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            g.displayName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            g == FitnessGoal.cut
                                ? 'Burn fat with a controlled ~400 kcal deficit while keeping protein high.'
                                : g == FitnessGoal.maintain
                                    ? 'Stay at maintenance calories while improving posture, strength & endurance.'
                                    : 'Build muscle mass with a gentle ~300 kcal surplus and progressive overload.',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildTargetsSummaryStep(bool isDark) {
    _updateCalculations();
    final p = _currentCalculatedProfile;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Your Target Plan',
            style: isDark ? AppTypography.headingLargeDark : AppTypography.headingLargeLight,
          ),
          const SizedBox(height: 8),
          Text(
            'Calculated based on Mifflin-St Jeor formula and your selected goal.',
            style: isDark ? AppTypography.bodyMediumDark : AppTypography.bodyMediumLight,
          ),
          const SizedBox(height: 24),
          // Calorie Target Hero Card
          ModuleCard(
            accentColor: AppColors.nutritionAmber,
            padding: const EdgeInsets.all(20),
            hasGlow: true,
            child: Column(
              children: [
                const Text(
                  'DAILY CALORIE TARGET',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5,
                    color: AppColors.nutritionAmber,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${p.targetCalories.round()} kcal',
                  style: const TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'BMR: ${p.bmr.round()} kcal • TDEE: ${p.tdee.round()} kcal',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Daily Macros breakdown
          Text(
            'Daily Macro Split',
            style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMacroCard(
                  title: 'Protein',
                  grams: p.targetProteinGrams.round(),
                  color: AppColors.gymCoral,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMacroCard(
                  title: 'Carbs',
                  grams: p.targetCarbsGrams.round(),
                  color: AppColors.nutritionAmber,
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMacroCard(
                  title: 'Fat',
                  grams: p.targetFatGrams.round(),
                  color: AppColors.progressIndigo,
                  isDark: isDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Ready note
          ModuleCard(
            accentColor: AppColors.primaryTeal,
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: AppColors.primaryTeal),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'You are all set! You can tweak these targets at any time in Settings.',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMacroCard({
    required String title,
    required int grams,
    required Color color,
    required bool isDark,
  }) {
    return ModuleCard(
      accentColor: color,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      child: Column(
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${grams}g',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectCard({
    required String label,
    required bool isSelected,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? color.withAlpha(isDark ? 40 : 25)
              : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? color : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Center(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected
                  ? color
                  : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
            ),
          ),
        ),
      ),
    );
  }
}
