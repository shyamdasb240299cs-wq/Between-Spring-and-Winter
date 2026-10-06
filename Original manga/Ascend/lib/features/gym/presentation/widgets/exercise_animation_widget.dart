import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/gym_exercise.dart';

enum ExerciseMotionType {
  legRaises,
  squat,
  benchPress,
  deadlift,
  pullUp,
  bicepCurl,
  tricepExtension,
  overheadPress,
  plankCore,
  generic,
}

class ExerciseAnimationWidget extends StatefulWidget {
  final GymExercise exercise;
  final double height;
  final bool showControls;

  const ExerciseAnimationWidget({
    super.key,
    required this.exercise,
    this.height = 220,
    this.showControls = true,
  });

  static ExerciseMotionType getMotionType(GymExercise ex) {
    final name = ex.name.toLowerCase();
    final id = ex.id.toLowerCase();

    if (name.contains('leg raise') || name.contains('knee raise') || id.contains('leg_raise')) {
      return ExerciseMotionType.legRaises;
    }
    if (name.contains('squat') || name.contains('leg press') || name.contains('split squat') || id.contains('squat')) {
      return ExerciseMotionType.squat;
    }
    if (name.contains('bench') || name.contains('push-up') || name.contains('chest press') || name.contains('fly') || id.contains('bench')) {
      return ExerciseMotionType.benchPress;
    }
    if (name.contains('deadlift') || name.contains('rdl') || name.contains('good morning') || id.contains('deadlift')) {
      return ExerciseMotionType.deadlift;
    }
    if (name.contains('pull') || name.contains('lat') || name.contains('chin') || name.contains('row') || id.contains('pull') || id.contains('row')) {
      return ExerciseMotionType.pullUp;
    }
    if (name.contains('curl') || id.contains('curl')) {
      return ExerciseMotionType.bicepCurl;
    }
    if (name.contains('tricep') || name.contains('pushdown') || name.contains('skull') || name.contains('dip') || id.contains('tricep')) {
      return ExerciseMotionType.tricepExtension;
    }
    if (name.contains('overhead') || name.contains('ohp') || name.contains('lateral raise') || name.contains('shoulder press') || id.contains('press')) {
      return ExerciseMotionType.overheadPress;
    }
    if (name.contains('plank') || name.contains('ab') || name.contains('woodchop') || name.contains('crunch') || ex.primaryMuscle == MuscleGroup.core) {
      return ExerciseMotionType.plankCore;
    }

    switch (ex.primaryMuscle) {
      case MuscleGroup.chest:
        return ExerciseMotionType.benchPress;
      case MuscleGroup.back:
        return ExerciseMotionType.pullUp;
      case MuscleGroup.legs:
        return ExerciseMotionType.squat;
      case MuscleGroup.arms:
        return ExerciseMotionType.bicepCurl;
      case MuscleGroup.shoulders:
        return ExerciseMotionType.overheadPress;
      case MuscleGroup.core:
        return ExerciseMotionType.legRaises;
      case MuscleGroup.fullBody:
        return ExerciseMotionType.deadlift;
    }
  }

  @override
  State<ExerciseAnimationWidget> createState() => _ExerciseAnimationWidgetState();
}

class _ExerciseAnimationWidgetState extends State<ExerciseAnimationWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isPlaying = true;
  double _speedMultiplier = 1.0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _togglePlayPause() {
    setState(() {
      if (_isPlaying) {
        _controller.stop();
        _isPlaying = false;
      } else {
        _controller.repeat();
        _isPlaying = true;
      }
    });
  }

  void _changeSpeed(double speed) {
    setState(() {
      _speedMultiplier = speed;
      _controller.duration = Duration(milliseconds: (2800 / speed).round());
      if (_isPlaying) {
        _controller.repeat();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final motionType = ExerciseAnimationWidget.getMotionType(widget.exercise);

    return Container(
      height: widget.height,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            // Background Grid Lines
            Positioned.fill(
              child: CustomPaint(
                painter: _GridBackgroundPainter(isDark: isDark),
              ),
            ),

            // Animated Biomechanical Exercise Canvas
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, _) {
                  // Phase: 0.0 -> 0.6 is Eccentric (Lowering/Extending), 0.6 -> 1.0 is Concentric (Contracting)
                  final rawVal = _controller.value;
                  // Sine wave oscillation for smooth natural human movement
                  final smoothProgress = (math.sin((rawVal * 2 * math.pi) - (math.pi / 2)) + 1) / 2;

                  return CustomPaint(
                    painter: _ExerciseBiomechanicalPainter(
                      motionType: motionType,
                      progress: smoothProgress,
                      isDark: isDark,
                      accentColor: AppColors.gymCoral,
                      secondaryColor: AppColors.primaryTeal,
                    ),
                  );
                },
              ),
            ),

            // Phase Banner (Eccentric / Concentric Indicator)
            Positioned(
              top: 10,
              left: 12,
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, _) {
                  final isConcentric = _controller.value > 0.5;
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isConcentric ? AppColors.gymCoral : AppColors.infoBlue).withAlpha(40),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: (isConcentric ? AppColors.gymCoral : AppColors.infoBlue).withAlpha(120),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isConcentric ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                          size: 13,
                          color: isConcentric ? AppColors.gymCoral : AppColors.infoBlue,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          isConcentric ? 'CONCENTRIC (DRIVE)' : 'ECCENTRIC (LOWER)',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isConcentric ? AppColors.gymCoral : AppColors.infoBlue,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // Exercise Target Muscles Chips
            Positioned(
              bottom: widget.showControls ? 46 : 10,
              left: 12,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.gymCoral.withAlpha(isDark ? 50 : 30),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      widget.exercise.primaryMuscle.displayName,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.gymCoral,
                      ),
                    ),
                  ),
                  if (widget.exercise.secondaryMuscle.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primaryTeal.withAlpha(isDark ? 45 : 25),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        widget.exercise.secondaryMuscle.split(',').first.trim(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryTeal,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Controls Bar (Play/Pause & Speed)
            if (widget.showControls)
              Positioned(
                bottom: 8,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: (isDark ? AppColors.darkSurface : AppColors.lightSurface).withAlpha(200),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      InkWell(
                        onTap: _togglePlayPause,
                        borderRadius: BorderRadius.circular(14),
                        child: Padding(
                          padding: const EdgeInsets.all(4),
                          child: Icon(
                            _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                            size: 18,
                            color: AppColors.gymCoral,
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      InkWell(
                        onTap: () {
                          if (_speedMultiplier == 1.0) {
                            _changeSpeed(1.5);
                          } else if (_speedMultiplier == 1.5) {
                            _changeSpeed(0.75);
                          } else {
                            _changeSpeed(1.0);
                          }
                        },
                        borderRadius: BorderRadius.circular(14),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                          child: Text(
                            '${_speedMultiplier}x',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _GridBackgroundPainter extends CustomPainter {
  final bool isDark;

  _GridBackgroundPainter({required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = (isDark ? Colors.white : Colors.black).withAlpha(12)
      ..strokeWidth = 1.0;

    const step = 24.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridBackgroundPainter oldDelegate) => oldDelegate.isDark != isDark;
}

class _ExerciseBiomechanicalPainter extends CustomPainter {
  final ExerciseMotionType motionType;
  final double progress; // 0.0 (rest/inflection) to 1.0 (peak contraction)
  final bool isDark;
  final Color accentColor;
  final Color secondaryColor;

  _ExerciseBiomechanicalPainter({
    required this.motionType,
    required this.progress,
    required this.isDark,
    required this.accentColor,
    required this.secondaryColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final centerX = size.width / 2;
    final centerY = size.height / 2;

    final skeletonPaint = Paint()
      ..color = isDark ? Colors.white.withAlpha(220) : const Color(0xFF1E293B)
      ..strokeWidth = 4.5
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final jointPaint = Paint()
      ..color = isDark ? Colors.white : const Color(0xFF0F172A)
      ..style = PaintingStyle.fill;

    final muscleGlowPaint = Paint()
      ..color = accentColor.withAlpha((140 + (progress * 115)).round())
      ..strokeWidth = 7.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final barPaint = Paint()
      ..color = const Color(0xFF94A3B8)
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round;

    final platePaint = Paint()
      ..color = accentColor
      ..strokeWidth = 8.0
      ..strokeCap = StrokeCap.round;

    switch (motionType) {
      case ExerciseMotionType.legRaises:
        _drawHangingLegRaises(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint);
        break;
      case ExerciseMotionType.squat:
        _drawSquat(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint, platePaint);
        break;
      case ExerciseMotionType.benchPress:
        _drawBenchPress(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint, platePaint);
        break;
      case ExerciseMotionType.deadlift:
        _drawDeadlift(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint, platePaint);
        break;
      case ExerciseMotionType.pullUp:
        _drawPullUp(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint);
        break;
      case ExerciseMotionType.bicepCurl:
        _drawBicepCurl(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint, platePaint);
        break;
      case ExerciseMotionType.tricepExtension:
        _drawTricepExtension(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint);
        break;
      case ExerciseMotionType.overheadPress:
        _drawOverheadPress(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint, platePaint);
        break;
      case ExerciseMotionType.plankCore:
        _drawPlank(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint);
        break;
      case ExerciseMotionType.generic:
        _drawSquat(canvas, centerX, centerY, progress, skeletonPaint, jointPaint, muscleGlowPaint, barPaint, platePaint);
        break;
    }
  }

  // 1. Hanging Leg Raises Animation (Core & Hip Flexors)
  void _drawHangingLegRaises(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
    Paint bar,
  ) {
    // Pull-up bar
    canvas.drawLine(Offset(cx - 55, cy - 75), Offset(cx + 55, cy - 75), bar);

    // Hands on bar
    final hands = Offset(cx, cy - 75);
    canvas.drawCircle(hands, 5, joint);

    // Head & Neck
    final head = Offset(cx, cy - 50);
    canvas.drawCircle(head, 10, joint);

    // Arms
    canvas.drawLine(hands, Offset(cx - 10, cy - 42), skeleton);
    canvas.drawLine(hands, Offset(cx + 10, cy - 42), skeleton);

    // Torso (Spine)
    final shoulders = Offset(cx, cy - 40);
    final hips = Offset(cx, cy);
    canvas.drawLine(shoulders, hips, skeleton);

    // Pulsing Core Rectus Abdominis Glow
    glow.strokeWidth = 8.0;
    canvas.drawLine(Offset(cx, cy - 30), Offset(cx, cy - 6), glow);

    // Legs: Angle from 0 deg (hanging straight down) to 90 deg (horizontal L-sit)
    final legAngle = (math.pi / 2) - (p * (math.pi / 2));
    final legLength = 48.0;
    final feetX = hips.dx + (legLength * math.cos(legAngle));
    final feetY = hips.dy + (legLength * math.sin(legAngle));
    final feet = Offset(feetX, feetY);

    canvas.drawLine(hips, feet, skeleton);
    canvas.drawCircle(hips, 4.5, joint);
    canvas.drawCircle(feet, 4.0, joint);
  }

  // 2. Barbell Squat Animation (Quads & Glutes)
  void _drawSquat(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
    Paint bar,
    Paint plate,
  ) {
    final squatDepth = p * 26.0;

    final head = Offset(cx, cy - 55 + squatDepth);
    canvas.drawCircle(head, 10, joint);

    final shoulders = Offset(cx, cy - 42 + squatDepth);
    final hips = Offset(cx - (p * 14.0), cy - 10 + squatDepth);
    canvas.drawLine(shoulders, hips, skeleton);

    // Barbell on Traps
    final barY = shoulders.dy - 2;
    canvas.drawLine(Offset(cx - 45, barY), Offset(cx + 45, barY), bar);
    canvas.drawLine(Offset(cx - 40, barY - 12), Offset(cx - 40, barY + 12), plate);
    canvas.drawLine(Offset(cx + 40, barY - 12), Offset(cx + 40, barY + 12), plate);

    // Knees & Feet
    final knees = Offset(cx + 12.0 + (p * 6.0), cy + 16 + (squatDepth * 0.4));
    final feet = Offset(cx + 6.0, cy + 50);

    // Quads glow
    glow.strokeWidth = 7.0;
    canvas.drawLine(hips, knees, glow);

    canvas.drawLine(hips, knees, skeleton);
    canvas.drawLine(knees, feet, skeleton);

    canvas.drawCircle(hips, 4.5, joint);
    canvas.drawCircle(knees, 4.5, joint);
    canvas.drawCircle(feet, 4.0, joint);
  }

  // 3. Bench Press Animation (Pectorals)
  void _drawBenchPress(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
    Paint bar,
    Paint plate,
  ) {
    // Bench Pad
    final benchPaint = Paint()
      ..color = const Color(0xFF334155)
      ..strokeWidth = 6.0
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(cx - 45, cy + 10), Offset(cx + 45, cy + 10), benchPaint);

    // Torso lying flat
    final head = Offset(cx - 30, cy + 4);
    canvas.drawCircle(head, 9, joint);

    final shoulders = Offset(cx - 15, cy + 4);
    final hips = Offset(cx + 25, cy + 4);
    canvas.drawLine(shoulders, hips, skeleton);

    // Chest glow
    glow.strokeWidth = 8.0;
    canvas.drawLine(shoulders, Offset(cx + 5, cy + 4), glow);

    // Barbell height
    final barY = (cy - 35) + (p * 28.0);
    final barX = shoulders.dx + 4;

    // Arms
    final elbow = Offset(barX - 14, (barY + cy) / 2 + (p * 8.0));
    canvas.drawLine(shoulders, elbow, skeleton);
    canvas.drawLine(elbow, Offset(barX, barY), skeleton);

    canvas.drawCircle(elbow, 4.0, joint);
    canvas.drawCircle(Offset(barX, barY), 4.5, joint);

    // Barbell
    canvas.drawLine(Offset(barX - 35, barY), Offset(barX + 35, barY), bar);
    canvas.drawLine(Offset(barX - 30, barY - 10), Offset(barX - 30, barY + 10), plate);
    canvas.drawLine(Offset(barX + 30, barY - 10), Offset(barX + 30, barY + 10), plate);
  }

  // 4. Deadlift Animation (Posterior Chain / Hamstrings / Back)
  void _drawDeadlift(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
    Paint bar,
    Paint plate,
  ) {
    final hingeProgress = p;

    final head = Offset(cx + (hingeProgress * 22), cy - 50 + (hingeProgress * 32));
    canvas.drawCircle(head, 9, joint);

    final shoulders = Offset(cx + (hingeProgress * 18), cy - 38 + (hingeProgress * 28));
    final hips = Offset(cx - (hingeProgress * 20), cy - 6 + (hingeProgress * 8));
    canvas.drawLine(shoulders, hips, skeleton);

    // Lower back & hamstring glow
    glow.strokeWidth = 7.0;
    canvas.drawLine(hips, Offset(cx - 5, cy + 22), glow);

    final knees = Offset(cx - 4, cy + 24);
    final feet = Offset(cx - 2, cy + 50);
    canvas.drawLine(hips, knees, skeleton);
    canvas.drawLine(knees, feet, skeleton);

    // Barbell at hands
    final barX = cx + 8;
    final barY = cy - 6 + (hingeProgress * 48);
    canvas.drawLine(shoulders, Offset(barX, barY), skeleton);

    canvas.drawLine(Offset(barX - 42, barY), Offset(barX + 42, barY), bar);
    canvas.drawLine(Offset(barX - 36, barY - 12), Offset(barX - 36, barY + 12), plate);
    canvas.drawLine(Offset(barX + 36, barY - 12), Offset(barX + 36, barY + 12), plate);

    canvas.drawCircle(hips, 4.5, joint);
    canvas.drawCircle(knees, 4.5, joint);
    canvas.drawCircle(feet, 4.0, joint);
  }

  // 5. Pull-Up / Lat Pulldown Animation (Lats)
  void _drawPullUp(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
    Paint bar,
  ) {
    canvas.drawLine(Offset(cx - 55, cy - 70), Offset(cx + 55, cy - 70), bar);

    final bodyOffset = -(p * 26.0);

    final head = Offset(cx, cy - 40 + bodyOffset);
    canvas.drawCircle(head, 9, joint);

    final shoulders = Offset(cx, cy - 28 + bodyOffset);
    final hips = Offset(cx, cy + 12 + bodyOffset);
    canvas.drawLine(shoulders, hips, skeleton);

    glow.strokeWidth = 8.0;
    canvas.drawLine(Offset(cx, cy - 24 + bodyOffset), Offset(cx, cy - 2 + bodyOffset), glow);

    final leftHand = Offset(cx - 28, cy - 70);
    final rightHand = Offset(cx + 28, cy - 70);
    final leftElbow = Offset(cx - 24 - (p * 10), cy - 40 + bodyOffset);
    final rightElbow = Offset(cx + 24 + (p * 10), cy - 40 + bodyOffset);

    canvas.drawLine(shoulders, leftElbow, skeleton);
    canvas.drawLine(leftElbow, leftHand, skeleton);
    canvas.drawLine(shoulders, rightElbow, skeleton);
    canvas.drawLine(rightElbow, rightHand, skeleton);

    final feet = Offset(cx, cy + 50 + bodyOffset);
    canvas.drawLine(hips, feet, skeleton);

    canvas.drawCircle(leftHand, 4.0, joint);
    canvas.drawCircle(rightHand, 4.0, joint);
  }

  // 6. Bicep Curl Animation (Biceps Peak)
  void _drawBicepCurl(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
    Paint bar,
    Paint plate,
  ) {
    final head = Offset(cx, cy - 50);
    canvas.drawCircle(head, 9, joint);

    final shoulders = Offset(cx, cy - 38);
    final hips = Offset(cx, cy);
    canvas.drawLine(shoulders, hips, skeleton);

    final elbow = Offset(cx + 6, cy - 14);
    canvas.drawLine(shoulders, elbow, skeleton);

    final curlAngle = (math.pi / 2) - (p * (math.pi * 0.75));
    final forearmLen = 28.0;
    final handX = elbow.dx + (forearmLen * math.cos(curlAngle));
    final handY = elbow.dy + (forearmLen * math.sin(curlAngle));
    final hand = Offset(handX, handY);

    glow.strokeWidth = 8.0;
    canvas.drawLine(shoulders, elbow, glow);

    canvas.drawLine(elbow, hand, skeleton);
    canvas.drawCircle(elbow, 4.0, joint);
    canvas.drawCircle(hand, 4.5, joint);

    canvas.drawLine(Offset(handX - 12, handY), Offset(handX + 12, handY), bar);
    canvas.drawCircle(Offset(handX - 10, handY), 5, plate);
    canvas.drawCircle(Offset(handX + 10, handY), 5, plate);

    final feet = Offset(cx, cy + 48);
    canvas.drawLine(hips, feet, skeleton);
  }

  // 7. Tricep Pushdown Animation (Triceps Lateral & Long Head)
  void _drawTricepExtension(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
    Paint bar,
  ) {
    canvas.drawCircle(Offset(cx + 12, cy - 65), 5, bar);

    final head = Offset(cx, cy - 48);
    canvas.drawCircle(head, 9, joint);

    final shoulders = Offset(cx, cy - 36);
    final hips = Offset(cx - 6, cy);
    canvas.drawLine(shoulders, hips, skeleton);

    final elbow = Offset(cx + 6, cy - 16);
    canvas.drawLine(shoulders, elbow, skeleton);

    glow.strokeWidth = 7.0;
    canvas.drawLine(Offset(shoulders.dx - 2, shoulders.dy), Offset(elbow.dx - 2, elbow.dy), glow);

    final angle = (p * (math.pi / 2));
    final handX = elbow.dx + (26.0 * math.cos(angle));
    final handY = elbow.dy + (26.0 * math.sin(angle));
    final hand = Offset(handX, handY);

    final cablePaint = Paint()
      ..color = const Color(0xFF64748B)
      ..strokeWidth = 2.0;
    canvas.drawLine(Offset(cx + 12, cy - 65), hand, cablePaint);

    canvas.drawLine(elbow, hand, skeleton);
    canvas.drawCircle(elbow, 4.0, joint);
    canvas.drawCircle(hand, 4.5, joint);

    final feet = Offset(cx - 4, cy + 48);
    canvas.drawLine(hips, feet, skeleton);
  }

  // 8. Overhead Press Animation (Shoulders / Delts)
  void _drawOverheadPress(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
    Paint bar,
    Paint plate,
  ) {
    final head = Offset(cx, cy - 35);
    canvas.drawCircle(head, 9, joint);

    final shoulders = Offset(cx, cy - 24);
    final hips = Offset(cx, cy + 8);
    canvas.drawLine(shoulders, hips, skeleton);

    glow.strokeWidth = 8.0;
    canvas.drawLine(Offset(cx - 14, cy - 24), Offset(cx + 14, cy - 24), glow);

    final barY = (cy - 24) - (p * 42.0);

    final leftHand = Offset(cx - 24, barY);
    final rightHand = Offset(cx + 24, barY);
    final leftElbow = Offset(cx - 20, (cy - 24 + barY) / 2 + 6);
    final rightElbow = Offset(cx + 20, (cy - 24 + barY) / 2 + 6);

    canvas.drawLine(shoulders, leftElbow, skeleton);
    canvas.drawLine(leftElbow, leftHand, skeleton);
    canvas.drawLine(shoulders, rightElbow, skeleton);
    canvas.drawLine(rightElbow, rightHand, skeleton);

    canvas.drawLine(Offset(cx - 45, barY), Offset(cx + 45, barY), bar);
    canvas.drawLine(Offset(cx - 38, barY - 10), Offset(cx - 38, barY + 10), plate);
    canvas.drawLine(Offset(cx + 38, barY - 10), Offset(cx + 38, barY + 10), plate);

    final feet = Offset(cx, cy + 50);
    canvas.drawLine(hips, feet, skeleton);
  }

  // 9. Isometric Plank Animation (Core)
  void _drawPlank(
    Canvas canvas,
    double cx,
    double cy,
    double p,
    Paint skeleton,
    Paint joint,
    Paint glow,
  ) {
    final head = Offset(cx - 40, cy - 10);
    canvas.drawCircle(head, 9, joint);

    final shoulders = Offset(cx - 26, cy - 6);
    final elbows = Offset(cx - 26, cy + 18);
    final hips = Offset(cx + 8, cy - 4);
    final feet = Offset(cx + 46, cy + 18);

    final floorPaint = Paint()
      ..color = const Color(0xFF475569)
      ..strokeWidth = 3.0;
    canvas.drawLine(Offset(cx - 55, cy + 20), Offset(cx + 55, cy + 20), floorPaint);

    canvas.drawLine(shoulders, elbows, skeleton);
    canvas.drawCircle(elbows, 4.0, joint);

    canvas.drawLine(shoulders, hips, skeleton);
    canvas.drawLine(hips, feet, skeleton);

    glow.strokeWidth = 8.0 + (p * 4.0);
    canvas.drawLine(shoulders, hips, glow);

    canvas.drawCircle(hips, 4.5, joint);
    canvas.drawCircle(feet, 4.0, joint);
  }

  @override
  bool shouldRepaint(covariant _ExerciseBiomechanicalPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.motionType != motionType || oldDelegate.isDark != isDark;
}
