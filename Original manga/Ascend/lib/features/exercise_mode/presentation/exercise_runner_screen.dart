import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/activity.dart';
import 'package:ascend/core/models/exercise_log.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/core/widgets/rest_timer_dialog.dart';
import 'package:ascend/features/today/state/today_providers.dart';
import 'exercise_summary_screen.dart';

class ExerciseRunnerScreen extends ConsumerStatefulWidget {
  final Activity activity;

  const ExerciseRunnerScreen({super.key, required this.activity});

  @override
  ConsumerState<ExerciseRunnerScreen> createState() => _ExerciseRunnerScreenState();
}

class _ExerciseRunnerScreenState extends ConsumerState<ExerciseRunnerScreen> {
  late int _currentSet;
  late int _totalSets;
  late int _targetReps;
  late int _currentReps;

  Timer? _timer;
  int _elapsedSeconds = 0;
  int _remainingSeconds = 0;
  bool _isRunning = false;

  double _distanceKm = 0.0;

  @override
  void initState() {
    super.initState();
    _currentSet = 1;
    _totalSets = widget.activity.defaultSets;
    _targetReps = widget.activity.defaultReps;
    _currentReps = widget.activity.defaultReps;
    _remainingSeconds = widget.activity.defaultDurationSeconds;

    if (widget.activity.type == ActivityType.time || widget.activity.type == ActivityType.cardio) {
      _startTimer();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _isRunning = true;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() {
        _elapsedSeconds++;
        if (widget.activity.type == ActivityType.time && _remainingSeconds > 0) {
          _remainingSeconds--;
          if (_remainingSeconds == 0) {
            HapticFeedback.heavyImpact();
            _onSetComplete();
          }
        }
      });
    });
  }

  void _pauseTimer() {
    _timer?.cancel();
    setState(() {
      _isRunning = false;
    });
  }

  void _toggleTimer() {
    if (_isRunning) {
      _pauseTimer();
    } else {
      _startTimer();
    }
  }

  void _onSetComplete() {
    HapticFeedback.mediumImpact();
    if (_currentSet < _totalSets) {
      RestTimerDialog.show(
        context,
        initialSeconds: 45,
        onCompleted: () {
          if (mounted) {
            setState(() {
              _currentSet++;
              _remainingSeconds = widget.activity.defaultDurationSeconds;
            });
            if (widget.activity.type == ActivityType.time) {
              _startTimer();
            }
          }
        },
      );
    } else {
      _finishExercise();
    }
  }

  void _finishExercise() {
    _timer?.cancel();
    final double calories = widget.activity.type == ActivityType.cardio
        ? (_distanceKm > 0 ? _distanceKm * 65.0 : _elapsedSeconds * 0.15)
        : (_currentSet * _targetReps * 1.5).clamp(10.0, 500.0);

    final log = ExerciseLog(
      id: const Uuid().v4(),
      activityId: widget.activity.id,
      activityTitle: widget.activity.title,
      category: widget.activity.category.name,
      timestamp: DateTime.now(),
      setsCompleted: _currentSet,
      repsCompleted: widget.activity.type == ActivityType.reps ? (_currentSet * _targetReps) : 0,
      durationSeconds: _elapsedSeconds,
      distanceKm: _distanceKm,
      caloriesBurned: calories,
    );

    ref.read(exerciseLogsProvider.notifier).addLog(log);

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => ExerciseSummaryScreen(log: log, activity: widget.activity),
      ),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isReps = widget.activity.type == ActivityType.reps;
    final isTime = widget.activity.type == ActivityType.time;
    final isCardio = widget.activity.type == ActivityType.cardio;

    return Scaffold(
      appBar: CustomAppBar(
        title: widget.activity.title,
        subtitle: 'Set $_currentSet of $_totalSets • ${widget.activity.targetArea}',
        accentColor: AppColors.primaryTeal,
        actions: [
          TextButton(
            onPressed: _finishExercise,
            child: const Text('Finish', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryTeal)),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              ModuleCard(
                accentColor: AppColors.primaryTeal,
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.primaryTeal, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        widget.activity.description,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),

              if (isReps) ...[
                Container(
                  width: 220,
                  height: 220,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.primaryTeal, width: 4),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryTeal.withAlpha(isDark ? 40 : 25),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$_currentReps',
                        style: const TextStyle(fontSize: 64, fontWeight: FontWeight.w900),
                      ),
                      Text(
                        'TARGET REPS',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1.2,
                          color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton.filledTonal(
                      onPressed: () {
                        if (_currentReps > 1) {
                          setState(() => _currentReps--);
                        }
                      },
                      icon: const Icon(Icons.remove),
                    ),
                    const SizedBox(width: 20),
                    const Text('Adjust Reps', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(width: 20),
                    IconButton.filledTonal(
                      onPressed: () {
                        setState(() => _currentReps++);
                      },
                      icon: const Icon(Icons.add),
                    ),
                  ],
                ),
              ] else ...[
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 220,
                      height: 220,
                      child: CircularProgressIndicator(
                        value: isTime && widget.activity.defaultDurationSeconds > 0
                            ? (_remainingSeconds / widget.activity.defaultDurationSeconds)
                            : 1.0,
                        strokeWidth: 8,
                        backgroundColor: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryTeal),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          isTime
                              ? DateFormatters.formatDuration(_remainingSeconds)
                              : DateFormatters.formatDuration(_elapsedSeconds),
                          style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w900),
                        ),
                        Text(
                          isTime ? 'REMAINING' : 'ELAPSED',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.2,
                            color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if (isCardio) ...[
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Distance (km): ', style: TextStyle(fontWeight: FontWeight.bold)),
                      SizedBox(
                        width: 100,
                        child: TextFormField(
                          initialValue: _distanceKm.toString(),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            isDense: true,
                            contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          ),
                          onChanged: (val) {
                            setState(() {
                              _distanceKm = double.tryParse(val) ?? 0.0;
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ],

              const Spacer(),

              Row(
                children: [
                  if (isTime || isCardio) ...[
                    OutlinedButton.icon(
                      onPressed: _toggleTimer,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      ),
                      icon: Icon(_isRunning ? Icons.pause : Icons.play_arrow),
                      label: Text(_isRunning ? 'Pause' : 'Resume'),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _onSetComplete,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryTeal,
                        padding: const EdgeInsets.symmetric(vertical: 18),
                      ),
                      child: Text(
                        _currentSet < _totalSets ? 'Complete Set $_currentSet' : 'Finish Activity',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }
}
