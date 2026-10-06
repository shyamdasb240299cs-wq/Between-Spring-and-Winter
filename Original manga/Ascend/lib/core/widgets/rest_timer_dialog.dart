import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_colors.dart';
import '../constants/app_typography.dart';

class RestTimerDialog extends StatefulWidget {
  final int initialSeconds;
  final VoidCallback onCompleted;

  const RestTimerDialog({
    super.key,
    this.initialSeconds = 90,
    required this.onCompleted,
  });

  static Future<void> show(
    BuildContext context, {
    int initialSeconds = 90,
    VoidCallback? onCompleted,
  }) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => RestTimerDialog(
        initialSeconds: initialSeconds,
        onCompleted: onCompleted ?? () {},
      ),
    );
  }

  @override
  State<RestTimerDialog> createState() => _RestTimerDialogState();
}

class _RestTimerDialogState extends State<RestTimerDialog> {
  late int _remainingSeconds;
  late int _totalSeconds;
  Timer? _timer;
  bool _isRunning = true;

  @override
  void initState() {
    super.initState();
    _remainingSeconds = widget.initialSeconds;
    _totalSeconds = widget.initialSeconds;
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        setState(() {
          _remainingSeconds--;
        });
        if (_remainingSeconds == 3 || _remainingSeconds == 2 || _remainingSeconds == 1) {
          HapticFeedback.selectionClick();
        }
      } else {
        _timer?.cancel();
        HapticFeedback.heavyImpact();
        widget.onCompleted();
        if (mounted) {
          Navigator.of(context).pop();
        }
      }
    });
  }

  void _togglePause() {
    if (_isRunning) {
      _timer?.cancel();
    } else {
      _startTimer();
    }
    setState(() {
      _isRunning = !_isRunning;
    });
  }

  void _addTime(int seconds) {
    setState(() {
      _remainingSeconds = (_remainingSeconds + seconds).clamp(0, 600);
      if (_remainingSeconds > _totalSeconds) {
        _totalSeconds = _remainingSeconds;
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _formattedTime {
    final mins = _remainingSeconds ~/ 60;
    final secs = _remainingSeconds % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progress = _totalSeconds > 0 ? (_remainingSeconds / _totalSeconds) : 0.0;

    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 32,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Rest Period',
                style: (isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight)
                    .copyWith(color: AppColors.gymCoral),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Timer dial
          Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: 170,
                height: 170,
                child: CircularProgressIndicator(
                  value: progress,
                  strokeWidth: 10,
                  backgroundColor: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.gymCoral),
                  strokeCap: StrokeCap.round,
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _formattedTime,
                    style: const TextStyle(
                      fontSize: 38,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                  Text(
                    'RECOVERY',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 28),
          // Time Adjustments
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton(
                onPressed: () => _addTime(-15),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('-15s'),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: _togglePause,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.gymCoral,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: Icon(_isRunning ? Icons.pause : Icons.play_arrow),
                label: Text(_isRunning ? 'Pause' : 'Resume'),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: () => _addTime(30),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('+30s'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () {
              _timer?.cancel();
              widget.onCompleted();
              Navigator.of(context).pop();
            },
            child: const Text(
              'Skip Rest Period',
              style: TextStyle(color: AppColors.gymCoral, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
