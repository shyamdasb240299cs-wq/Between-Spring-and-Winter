import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Brand & Module Colors
  static const Color primaryTeal = Color(0xFF0E7C66); // Deep Emerald Teal - Posture / Brand
  static const Color primaryTealLight = Color(0xFF149E82);
  static const Color primaryTealDark = Color(0xFF095244);

  static const Color gymCoral = Color(0xFFFF6B4A); // Coral - Gym / Strength module
  static const Color gymCoralLight = Color(0xFFFF8B70);
  static const Color gymCoralDark = Color(0xFFD44828);

  static const Color nutritionAmber = Color(0xFFF2A93B); // Golden Amber - Calorie & Nutrition
  static const Color nutritionAmberLight = Color(0xFFFFC062);
  static const Color nutritionAmberDark = Color(0xFFC7831B);

  static const Color progressIndigo = Color(0xFF5B5FEF); // Indigo - Progress / Photos module
  static const Color progressIndigoLight = Color(0xFF7E81F5);
  static const Color progressIndigoDark = Color(0xFF3F42B8);

  // Status & Feedback Colors
  static const Color successMint = Color(0xFF3DDC97); // Mint Green - Completed / Streak
  static const Color warningAmber = Color(0xFFFFC24B); // Amber Yellow - Warning
  static const Color errorRed = Color(0xFFFF5C5C); // Soft Red - Error only
  static const Color infoBlue = Color(0xFF389BF2);

  // Dark Theme Palette (Default)
  static const Color darkBackground = Color(0xFF0F1214);
  static const Color darkSurface = Color(0xFF1A1F22);
  static const Color darkSurfaceVariant = Color(0xFF22282C);
  static const Color darkBorder = Color(0xFF262C2F);
  static const Color darkTextPrimary = Color(0xFFF5F4F2);
  static const Color darkTextSecondary = Color(0xFF9CA6A4);
  static const Color darkTextMuted = Color(0xFF6B7573);

  // Light Theme Palette
  static const Color lightBackground = Color(0xFFFAF8F5);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceVariant = Color(0xFFF2EFE9);
  static const Color lightBorder = Color(0xFFE7E3DD);
  static const Color lightTextPrimary = Color(0xFF1A1F1E);
  static const Color lightTextSecondary = Color(0xFF6B7573);
  static const Color lightTextMuted = Color(0xFFA0A8A6);

  // Gradients
  static const LinearGradient brandGradient = LinearGradient(
    colors: [primaryTeal, gymCoral],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient tealGradient = LinearGradient(
    colors: [primaryTeal, primaryTealLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient coralGradient = LinearGradient(
    colors: [gymCoral, gymCoralLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient amberGradient = LinearGradient(
    colors: [nutritionAmber, nutritionAmberLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient indigoGradient = LinearGradient(
    colors: [progressIndigo, progressIndigoLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkCardGradient = LinearGradient(
    colors: [Color(0xFF1A1F22), Color(0xFF161A1C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
