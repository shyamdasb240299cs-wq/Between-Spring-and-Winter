import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class ModuleCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? accentColor;
  final VoidCallback? onTap;
  final double borderRadius;
  final bool hasGlow;

  const ModuleCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.margin,
    this.accentColor,
    this.onTap,
    this.borderRadius = 16,
    this.hasGlow = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? AppColors.darkSurface : AppColors.lightSurface;
    final borderColor = accentColor != null
        ? accentColor!.withAlpha(isDark ? 60 : 80)
        : (isDark ? AppColors.darkBorder : AppColors.lightBorder);

    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: baseColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: borderColor, width: accentColor != null ? 1.5 : 1.0),
        boxShadow: hasGlow && accentColor != null
            ? [
                BoxShadow(
                  color: accentColor!.withAlpha(30),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(borderRadius),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(16),
            child: child,
          ),
        ),
      ),
    );
  }
}
