import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/progress_photo.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/empty_state_view.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/progress/state/progress_providers.dart';
import 'add_photo_screen.dart';
import 'photo_compare_screen.dart';

class PhotoGalleryScreen extends ConsumerStatefulWidget {
  const PhotoGalleryScreen({super.key});

  @override
  ConsumerState<PhotoGalleryScreen> createState() => _PhotoGalleryScreenState();
}

class _PhotoGalleryScreenState extends ConsumerState<PhotoGalleryScreen> {
  PhotoCategory? _filterCategory;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allPhotos = ref.watch(progressPhotosProvider);

    final filtered = _filterCategory == null
        ? allPhotos
        : allPhotos.where((p) => p.category == _filterCategory).toList();

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Photo Gallery',
        subtitle: '${allPhotos.length} timeline snapshots',
        accentColor: AppColors.progressIndigo,
        actions: [
          IconButton(
            icon: const Icon(Icons.compare),
            tooltip: 'Compare Photos',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const PhotoCompareScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.add_a_photo),
            tooltip: 'Add Photo',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const AddPhotoScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filter categories
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  _buildChip('All Angles', _filterCategory == null, () {
                    setState(() => _filterCategory = null);
                  }, isDark),
                  const SizedBox(width: 8),
                  ...PhotoCategory.values.map((cat) {
                    final isSel = _filterCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _buildChip(cat.displayName, isSel, () {
                        setState(() => _filterCategory = cat);
                      }, isDark),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 8),

            Expanded(
              child: filtered.isEmpty
                  ? EmptyStateView(
                      icon: Icons.photo_camera_outlined,
                      title: 'No Photos in this Angle',
                      message: 'Take bi-weekly check-in photos to observe posture and muscle composition changes.',
                      actionLabel: 'Take Photo',
                      onAction: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AddPhotoScreen()),
                        );
                      },
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 0.75,
                      ),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final photo = filtered[index];
                        final file = File(photo.filePath);

                        return ModuleCard(
                          accentColor: AppColors.progressIndigo,
                          padding: EdgeInsets.zero,
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: file.existsSync()
                                    ? Image.file(file, fit: BoxFit.cover)
                                    : Container(
                                        color: AppColors.darkSurfaceVariant,
                                        child: const Center(
                                          child: Icon(Icons.accessibility_new, size: 40, color: AppColors.progressIndigo),
                                        ),
                                      ),
                              ),
                              Positioned(
                                bottom: 0,
                                left: 0,
                                right: 0,
                                child: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [Colors.transparent, Colors.black.withAlpha(200)],
                                      begin: Alignment.topCenter,
                                      end: Alignment.bottomCenter,
                                    ),
                                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        photo.category.displayName,
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      Text(
                                        DateFormatters.formatShortDate(photo.date),
                                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 6,
                                right: 6,
                                child: IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.white70, size: 18),
                                  onPressed: () {
                                    ref.read(progressPhotosProvider.notifier).deletePhoto(photo.id);
                                  },
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChip(String label, bool isSelected, VoidCallback onTap, bool isDark) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.progressIndigo
              : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? AppColors.progressIndigo : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
          ),
        ),
      ),
    );
  }
}
