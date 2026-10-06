import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/nutrition_entry.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/nutrition/state/nutrition_providers.dart';

class LogMealScreen extends ConsumerStatefulWidget {
  const LogMealScreen({super.key});

  @override
  ConsumerState<LogMealScreen> createState() => _LogMealScreenState();
}

class _LogMealScreenState extends ConsumerState<LogMealScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _caloriesController = TextEditingController();
  final TextEditingController _proteinController = TextEditingController();
  final TextEditingController _carbsController = TextEditingController();
  final TextEditingController _fatController = TextEditingController();
  MealType _selectedMealType = MealType.lunch;

  // Preset Common Foods
  final List<NutritionEntry> _commonPresets = [
    NutritionEntry(
      id: 'p1',
      name: 'Chicken Breast & Rice (200g)',
      mealType: MealType.lunch,
      calories: 450,
      proteinGrams: 42,
      carbsGrams: 50,
      fatGrams: 6,
      timestamp: DateTime.now(),
    ),
    NutritionEntry(
      id: 'p2',
      name: 'Whey Protein Shake (1 scoop)',
      mealType: MealType.snack,
      calories: 130,
      proteinGrams: 25,
      carbsGrams: 3,
      fatGrams: 1.5,
      timestamp: DateTime.now(),
    ),
    NutritionEntry(
      id: 'p3',
      name: 'Eggs & Whole Wheat Toast (3 eggs)',
      mealType: MealType.breakfast,
      calories: 380,
      proteinGrams: 22,
      carbsGrams: 28,
      fatGrams: 18,
      timestamp: DateTime.now(),
    ),
    NutritionEntry(
      id: 'p4',
      name: 'Greek Yogurt & Berries (200g)',
      mealType: MealType.breakfast,
      calories: 180,
      proteinGrams: 18,
      carbsGrams: 20,
      fatGrams: 2,
      timestamp: DateTime.now(),
    ),
    NutritionEntry(
      id: 'p5',
      name: 'Salmon Fillet & Sweet Potato',
      mealType: MealType.dinner,
      calories: 520,
      proteinGrams: 38,
      carbsGrams: 45,
      fatGrams: 18,
      timestamp: DateTime.now(),
    ),
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _caloriesController.dispose();
    _proteinController.dispose();
    _carbsController.dispose();
    _fatController.dispose();
    super.dispose();
  }

  void _saveMeal() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter food / meal name.')),
      );
      return;
    }

    final p = double.tryParse(_proteinController.text) ?? 0.0;
    final c = double.tryParse(_carbsController.text) ?? 0.0;
    final f = double.tryParse(_fatController.text) ?? 0.0;

    double cal = double.tryParse(_caloriesController.text) ?? 0.0;
    if (cal == 0.0 && (p > 0 || c > 0 || f > 0)) {
      // Auto compute calories from 4-4-9 formula
      cal = (p * 4) + (c * 4) + (f * 9);
    }

    final entry = NutritionEntry(
      id: const Uuid().v4(),
      name: name,
      mealType: _selectedMealType,
      calories: cal,
      proteinGrams: p,
      carbsGrams: c,
      fatGrams: f,
      timestamp: DateTime.now(),
    );

    ref.read(nutritionEntriesProvider.notifier).addEntry(entry);
    Navigator.of(context).pop();
  }

  void _applyPreset(NutritionEntry p) {
    setState(() {
      _nameController.text = p.name;
      _selectedMealType = p.mealType;
      _caloriesController.text = p.calories.round().toString();
      _proteinController.text = p.proteinGrams.round().toString();
      _carbsController.text = p.carbsGrams.round().toString();
      _fatController.text = p.fatGrams.round().toString();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Log Meal / Food',
        accentColor: AppColors.nutritionAmber,
        actions: [
          TextButton(
            onPressed: _saveMeal,
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
              // Meal Type Selector Chips
              Row(
                children: MealType.values.map((type) {
                  final isSel = _selectedMealType == type;
                  return Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: type != MealType.snack ? 6 : 0),
                      child: InkWell(
                        onTap: () => setState(() => _selectedMealType = type),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: isSel
                                ? AppColors.nutritionAmber
                                : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: Text(
                              type.displayName,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                                color: isSel ? Colors.black87 : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Meal / Food Name',
                  hintText: 'e.g. Oatmeal with Whey & Almond Butter',
                ),
              ),
              const SizedBox(height: 14),

              // Calories Input
              TextField(
                controller: _caloriesController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Total Calories (kcal)',
                  suffixText: 'kcal',
                  hintText: 'e.g. 450 (or leave 0 to auto-calculate from macros)',
                ),
              ),
              const SizedBox(height: 14),

              // Macro Split (Protein, Carbs, Fat)
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _proteinController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Protein',
                        suffixText: 'g',
                        hintText: '30',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _carbsController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Carbs',
                        suffixText: 'g',
                        hintText: '40',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _fatController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Fat',
                        suffixText: 'g',
                        hintText: '10',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Quick Presets List
              Text(
                'Quick Tap Presets',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 10),

              ..._commonPresets.map((preset) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ModuleCard(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    onTap: () => _applyPreset(preset),
                    child: Row(
                      children: [
                        const Icon(Icons.flash_on, color: AppColors.nutritionAmber, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(preset.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text(
                                '${preset.calories.round()} kcal • P: ${preset.proteinGrams.round()}g, C: ${preset.carbsGrams.round()}g, F: ${preset.fatGrams.round()}g',
                                style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.add_circle_outline, color: AppColors.nutritionAmber, size: 20),
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
