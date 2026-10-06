import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/progress/state/progress_providers.dart';
import 'add_photo_screen.dart';
import 'body_metrics_screen.dart';
import 'photo_compare_screen.dart';
import 'photo_gallery_screen.dart';

class ProgressScreen extends ConsumerWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final photos = ref.watch(progressPhotosProvider);
    final metrics = ref.watch(bodyMetricsProvider);

    final latestMetric = metrics.isNotEmpty ? metrics.last : null;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Progress & Evolution',
        subtitle: 'Photos, Metrics & Visual Timeline',
        accentColor: AppColors.progressIndigo,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_a_photo_outlined),
            tooltip: 'Take Photo',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AddPhotoScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Photo Comparison Launcher Card
              ModuleCard(
                accentColor: AppColors.progressIndigo,
                padding: const EdgeInsets.all(18),
                hasGlow: true,
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const PhotoCompareScreen()),
                  );
                },
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.progressIndigo.withAlpha(isDark ? 40 : 25),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.compare_arrows, color: AppColors.progressIndigo, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Compare Before & After',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Side-by-side, interactive split slider & timeline scrub',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.progressIndigo),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Body Metrics Summary Card
              ModuleCard(
                accentColor: AppColors.primaryTeal,
                padding: const EdgeInsets.all(16),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const BodyMetricsScreen()),
                  );
                },
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primaryTeal.withAlpha(isDark ? 40 : 25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.show_chart, color: AppColors.primaryTeal, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Body Metrics & Trend Line',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            latestMetric != null
                                ? 'Weight: ${latestMetric.weightKg} kg • ${metrics.length} logs'
                                : 'Track weight, waist, and body composition',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.primaryTeal),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Recent Progress Photos Reel
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Photo Timeline (${photos.length})',
                    style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const PhotoGalleryScreen()),
                      );
                    },
                    child: const Text(
                      'View All Gallery',
                      style: TextStyle(color: AppColors.progressIndigo, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              if (photos.isEmpty)
                ModuleCard(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const Icon(Icons.photo_camera_outlined, size: 40, color: AppColors.progressIndigo),
                      const SizedBox(height: 10),
                      const Text(
                        'No progress photos recorded yet.',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Take photos every 2-4 weeks with consistent posture and lighting.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                      ),
                      const SizedBox(height: 14),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.progressIndigo),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const AddPhotoScreen()),
                          );
                        },
                        icon: const Icon(Icons.camera_alt),
                        label: const Text('Capture First Photo'),
                      ),
                    ],
                  ),
                )
              else
                SizedBox(
                  height: 180,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: photos.length,
                    itemBuilder: (context, index) {
                      final photo = photos[index];
                      final file = File(photo.filePath);

                      return Container(
                        width: 130,
                        margin: const EdgeInsets.only(right: 12),
                        child: ModuleCard(
                          accentColor: AppColors.progressIndigo,
                          padding: EdgeInsets.zero,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const PhotoGalleryScreen()),
                            );
                          },
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                file.existsSync()
                                    ? Image.file(file, fit: BoxFit.cover)
                                    : Container(
                                        color: AppColors.darkSurfaceVariant,
                                        child: const Center(
                                          child: Icon(Icons.accessibility_new, color: AppColors.progressIndigo),
                                        ),
                                      ),
                                Positioned(
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  child: Container(
                                    padding: const EdgeInsets.all(6),
                                    color: Colors.black54,
                                    child: Text(
                                      '${photo.category.displayName}\n${DateFormatters.formatShortDate(photo.date)}',
                                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
