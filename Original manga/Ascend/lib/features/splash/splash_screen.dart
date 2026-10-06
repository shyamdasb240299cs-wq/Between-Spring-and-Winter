import 'package:flutter/material.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/database/database_keys.dart';
import 'package:ascend/core/database/hive_service.dart';
import 'package:ascend/core/models/user_profile.dart';
import 'package:ascend/features/navigation/main_navigation_screen.dart';
import 'package:ascend/features/onboarding/onboarding_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );

    _scaleAnimation = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.7, curve: Curves.easeOutCubic),
      ),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
      ),
    );

    _glowAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.4, 0.9, curve: Curves.easeInOut),
      ),
    );

    _controller.forward().then((_) {
      _navigateToNext();
    });
  }

  void _navigateToNext() {
    if (!mounted) return;

    final profileMap = HiveService.instance.userProfileBox.get(DatabaseKeys.userProfileKey);
    bool isOnboarded = false;
    if (profileMap != null) {
      final profile = UserProfile.fromMap(profileMap);
      isOnboarded = profile.isOnboarded;
    }

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 600),
        pageBuilder: (context, animation, secondaryAnimation) {
          return isOnboarded ? const MainNavigationScreen() : const OnboardingScreen();
        },
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: Center(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Brand Icon Mark
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        gradient: AppColors.brandGradient,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primaryTeal.withAlpha((80 * _glowAnimation.value).toInt()),
                            blurRadius: 30 * _glowAnimation.value,
                            offset: const Offset(-4, 6),
                          ),
                          BoxShadow(
                            color: AppColors.gymCoral.withAlpha((70 * _glowAnimation.value).toInt()),
                            blurRadius: 30 * _glowAnimation.value,
                            offset: const Offset(4, 6),
                          ),
                        ],
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          CustomPaint(
                            size: const Size(60, 60),
                            painter: _AscendLogoPainter(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                    // App Name
                    Text(
                      'ASCEND',
                      style: AppTypography.headingLargeDark.copyWith(
                        letterSpacing: 4.0,
                        fontWeight: FontWeight.w800,
                        color: AppColors.darkTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Tagline
                    Text(
                      'Stand tall. Train hard. Track everything.',
                      style: AppTypography.bodySmallDark.copyWith(
                        color: AppColors.darkTextSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _AscendLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFF5F4F2)
      ..style = PaintingStyle.fill;

    final path = Path();
    final w = size.width;
    final h = size.height;

    // Head circle
    canvas.drawCircle(Offset(w * 0.5, h * 0.22), w * 0.09, paint);

    // Spine / Ascending chevron body
    path.moveTo(w * 0.5, h * 0.38);
    path.lineTo(w * 0.72, h * 0.56);
    path.lineTo(w * 0.62, h * 0.65);
    path.lineTo(w * 0.5, h * 0.52);
    path.lineTo(w * 0.38, h * 0.65);
    path.lineTo(w * 0.28, h * 0.56);
    path.close();

    // Secondary lower ascending line
    path.moveTo(w * 0.5, h * 0.64);
    path.lineTo(w * 0.72, h * 0.82);
    path.lineTo(w * 0.62, h * 0.90);
    path.lineTo(w * 0.5, h * 0.77);
    path.lineTo(w * 0.38, h * 0.90);
    path.lineTo(w * 0.28, h * 0.82);
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
