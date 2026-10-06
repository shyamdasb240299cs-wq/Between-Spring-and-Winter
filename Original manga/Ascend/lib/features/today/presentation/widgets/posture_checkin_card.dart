import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/posture_checkin.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/posture/state/posture_providers.dart';

class PostureCheckinCard extends ConsumerWidget {
  const PostureCheckinCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final checkins = ref.watch(postureCheckinsProvider);
    final now = DateTime.now();

    final todayCheckin = checkins.where((c) => DateFormatters.isSameDay(c.timestamp, now)).firstOrNull;

    return ModuleCard(
      accentColor: AppColors.primaryTeal,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.accessibility_new, color: AppColors.primaryTeal, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Posture Check-in',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: AppColors.primaryTeal,
                ),
              ),
              const Spacer(),
              if (todayCheckin != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.successMint.withAlpha(isDark ? 35 : 25),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Logged Today',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.successMint,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'How is your spine alignment and neck posture right now?',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: PostureRating.values.map((rating) {
              final isSelected = todayCheckin?.rating == rating;
              return Expanded(
                child: Container(
                  margin: EdgeInsets.only(
                    right: rating != PostureRating.values.last ? 8 : 0,
                  ),
                  child: InkWell(
                    onTap: () {
                      final newCheckin = PostureCheckin(
                        id: const Uuid().v4(),
                        timestamp: DateTime.now(),
                        rating: rating,
                        note: 'Logged from Today view',
                      );
                      ref.read(postureCheckinsProvider.notifier).addCheckin(newCheckin);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primaryTeal.withAlpha(isDark ? 50 : 35)
                            : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primaryTeal
                              : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(rating.emoji, style: const TextStyle(fontSize: 22)),
                          const SizedBox(height: 4),
                          Text(
                            rating.displayName,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                              color: isSelected
                                  ? AppColors.primaryTeal
                                  : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
