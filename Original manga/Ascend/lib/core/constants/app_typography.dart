import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  AppTypography._();

  // Dark Theme Text Styles
  static TextStyle get headingLargeDark => GoogleFonts.poppins(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: AppColors.darkTextPrimary,
        letterSpacing: -0.5,
      );

  static TextStyle get headingMediumDark => GoogleFonts.poppins(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: AppColors.darkTextPrimary,
        letterSpacing: -0.3,
      );

  static TextStyle get headingSmallDark => GoogleFonts.poppins(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.darkTextPrimary,
      );

  static TextStyle get titleMediumDark => GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.darkTextPrimary,
      );

  static TextStyle get bodyLargeDark => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: AppColors.darkTextPrimary,
        height: 1.4,
      );

  static TextStyle get bodyMediumDark => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: AppColors.darkTextSecondary,
        height: 1.4,
      );

  static TextStyle get bodySmallDark => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.darkTextMuted,
      );

  static TextStyle get labelLargeDark => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.darkTextPrimary,
      );

  static TextStyle get labelSmallDark => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: AppColors.darkTextMuted,
        letterSpacing: 0.2,
      );

  // Light Theme Text Styles
  static TextStyle get headingLargeLight => GoogleFonts.poppins(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: AppColors.lightTextPrimary,
        letterSpacing: -0.5,
      );

  static TextStyle get headingMediumLight => GoogleFonts.poppins(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: AppColors.lightTextPrimary,
        letterSpacing: -0.3,
      );

  static TextStyle get headingSmallLight => GoogleFonts.poppins(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.lightTextPrimary,
      );

  static TextStyle get titleMediumLight => GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.lightTextPrimary,
      );

  static TextStyle get bodyLargeLight => GoogleFonts.inter(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: AppColors.lightTextPrimary,
        height: 1.4,
      );

  static TextStyle get bodyMediumLight => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: AppColors.lightTextSecondary,
        height: 1.4,
      );

  static TextStyle get bodySmallLight => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.lightTextMuted,
      );

  static TextStyle get labelLargeLight => GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: AppColors.lightTextPrimary,
      );

  static TextStyle get labelSmallLight => GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: AppColors.lightTextMuted,
        letterSpacing: 0.2,
      );
}
