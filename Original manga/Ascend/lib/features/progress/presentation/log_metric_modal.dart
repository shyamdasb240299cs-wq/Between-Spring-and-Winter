import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/body_metric.dart';
import 'package:ascend/features/progress/state/progress_providers.dart';

class LogMetricModal extends ConsumerStatefulWidget {
  const LogMetricModal({super.key});

  static Future<void> show(BuildContext context) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const LogMetricModal(),
    );
  }

  @override
  ConsumerState<LogMetricModal> createState() => _LogMetricModalState();
}

class _LogMetricModalState extends ConsumerState<LogMetricModal> {
  final TextEditingController _weightController = TextEditingController();
  final TextEditingController _waistController = TextEditingController();
  final TextEditingController _chestController = TextEditingController();
  final TextEditingController _armsController = TextEditingController();
  final TextEditingController _thighsController = TextEditingController();
  final TextEditingController _bodyFatController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  final DateTime _date = DateTime.now();

  @override
  void dispose() {
    _weightController.dispose();
    _waistController.dispose();
    _chestController.dispose();
    _armsController.dispose();
    _thighsController.dispose();
    _bodyFatController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _save() {
    final weight = double.tryParse(_weightController.text);
    if (weight == null || weight <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid weight measurement.')),
      );
      return;
    }

    final metric = BodyMetric(
      id: const Uuid().v4(),
      date: _date,
      weightKg: weight,
      waistCm: double.tryParse(_waistController.text),
      chestCm: double.tryParse(_chestController.text),
      armsCm: double.tryParse(_armsController.text),
      thighsCm: double.tryParse(_thighsController.text),
      bodyFatPercentage: double.tryParse(_bodyFatController.text),
      notes: _notesController.text.trim(),
    );

    ref.read(bodyMetricsProvider.notifier).addMetric(metric);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Log Body Measurements',
              style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
            ),
            const SizedBox(height: 6),
            Text(
              'Consistent bi-weekly tracking provides smooth, reliable trend lines.',
              style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
            ),
            const SizedBox(height: 16),

            // Weight & Body Fat
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _weightController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Weight *',
                      suffixText: 'kg',
                      hintText: '68.0',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _bodyFatController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Body Fat',
                      suffixText: '%',
                      hintText: '15.0',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Waist & Chest
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _waistController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Waist',
                      suffixText: 'cm',
                      hintText: '80.0',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _chestController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Chest',
                      suffixText: 'cm',
                      hintText: '98.0',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Arms & Thighs
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _armsController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Arms',
                      suffixText: 'cm',
                      hintText: '35.0',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _thighsController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Thighs',
                      suffixText: 'cm',
                      hintText: '56.0',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Notes',
                hintText: 'e.g. Measured in morning before breakfast',
              ),
            ),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.progressIndigo,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _save,
                child: const Text('Save Measurements', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
