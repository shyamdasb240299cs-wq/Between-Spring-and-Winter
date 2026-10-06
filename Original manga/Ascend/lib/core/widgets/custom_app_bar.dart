import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_typography.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  final Widget? leading;
  final List<Widget>? actions;
  final Color? accentColor;
  final bool showStreak;
  final int streakDays;

  const CustomAppBar({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.actions,
    this.accentColor,
    this.showStreak = false,
    this.streakDays = 1,
  });

  @override
  Size get preferredSize => Size.fromHeight(subtitle != null ? 70 : 56);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AppBar(
      leading: leading,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: (isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight).copyWith(
              color: accentColor ?? (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle!,
              style: isDark ? AppTypography.bodySmallDark : AppTypography.bodySmallLight,
            ),
          ],
        ],
      ),
      actions: [
        if (showStreak)
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.gymCoral.withAlpha(isDark ? 35 : 25),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.gymCoral.withAlpha(80)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.local_fire_department, color: AppColors.gymCoral, size: 18),
                const SizedBox(width: 4),
                Text(
                  '$streakDays d',
                  style: TextStyle(
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ...?actions,
        const SizedBox(width: 8),
      ],
    );
  }
}
