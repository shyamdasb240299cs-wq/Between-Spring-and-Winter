import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/models/progress_photo.dart';
import 'package:ascend/core/utils/date_formatters.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/features/progress/state/progress_providers.dart';

enum CompareMode { sideBySide, slider, timelineScrub }

class PhotoCompareScreen extends ConsumerStatefulWidget {
  const PhotoCompareScreen({super.key});

  @override
  ConsumerState<PhotoCompareScreen> createState() => _PhotoCompareScreenState();
}

class _PhotoCompareScreenState extends ConsumerState<PhotoCompareScreen> {
  CompareMode _mode = CompareMode.sideBySide;
  PhotoCategory _selectedCategory = PhotoCategory.front;
  int _beforeIndex = 0;
  int _afterIndex = 0;
  double _sliderPosition = 0.5; // 0.0 to 1.0
  double _scrubValue = 0.0;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allPhotos = ref.watch(progressPhotosProvider);

    final categoryPhotos = allPhotos.where((p) => p.category == _selectedCategory).toList();
    // Sort oldest first for progression
    categoryPhotos.sort((a, b) => a.date.compareTo(b.date));

    if (_beforeIndex >= categoryPhotos.length && categoryPhotos.isNotEmpty) {
      _beforeIndex = 0;
    }
    if (_afterIndex >= categoryPhotos.length && categoryPhotos.isNotEmpty) {
      _afterIndex = categoryPhotos.length - 1;
    }

    final ProgressPhoto? beforePhoto = categoryPhotos.isNotEmpty ? categoryPhotos[_beforeIndex] : null;
    final ProgressPhoto? afterPhoto = categoryPhotos.isNotEmpty ? categoryPhotos[_afterIndex] : null;

    return Scaffold(
      appBar: const CustomAppBar(
        title: 'Visual Evolution',
        subtitle: 'Before & After Comparison',
        accentColor: AppColors.progressIndigo,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Mode Selector tabs
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  _buildModeTab(CompareMode.sideBySide, 'Side-by-Side', Icons.view_column, isDark),
                  const SizedBox(width: 8),
                  _buildModeTab(CompareMode.slider, 'Split Slider', Icons.compare, isDark),
                  const SizedBox(width: 8),
                  _buildModeTab(CompareMode.timelineScrub, 'Scrubber', Icons.linear_scale, isDark),
                ],
              ),
            ),

            // Angle Category Selector
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: PhotoCategory.values.map((cat) {
                  final isSel = _selectedCategory == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedCategory = cat;
                          _beforeIndex = 0;
                          _afterIndex = 0;
                        });
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSel
                              ? AppColors.progressIndigo
                              : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSel ? AppColors.progressIndigo : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                        ),
                        child: Text(
                          cat.displayName,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                            color: isSel ? Colors.white : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 10),

            // Main Comparison Canvas
            Expanded(
              child: categoryPhotos.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.photo_size_select_actual_outlined, size: 48, color: AppColors.progressIndigo),
                            const SizedBox(height: 12),
                            const Text('No photos for this angle yet.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 6),
                            Text(
                              'Take at least 2 photos in ${_selectedCategory.displayName} to unlock comparison slider.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                            ),
                          ],
                        ),
                      ),
                    )
                  : categoryPhotos.length == 1
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: _buildPhotoWidget(categoryPhotos.first, height: 260),
                                ),
                                const SizedBox(height: 16),
                                const Text('1 photo logged for this angle.', style: TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text(
                                  'Add a second check-in photo to compare before & after changes.',
                                  style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                                ),
                              ],
                            ),
                          ),
                        )
                      : _buildComparisonCanvas(beforePhoto!, afterPhoto!, categoryPhotos, isDark),
            ),

            // Disclaimer Banner
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'Note: Purpose is visual self-monitoring and posture awareness, not medical diagnosis.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                  color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComparisonCanvas(
    ProgressPhoto before,
    ProgressPhoto after,
    List<ProgressPhoto> allAnglePhotos,
    bool isDark,
  ) {
    if (_mode == CompareMode.sideBySide) {
      return Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                children: [
                  Text(
                    'BEFORE (${DateFormatters.formatShortDate(before.date)})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.primaryTeal),
                  ),
                  const SizedBox(height: 6),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: _buildPhotoWidget(before),
                    ),
                  ),
                  if (before.weightKg != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('${before.weightKg} kg', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                children: [
                  Text(
                    'AFTER (${DateFormatters.formatShortDate(after.date)})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.gymCoral),
                  ),
                  const SizedBox(height: 6),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: _buildPhotoWidget(after),
                    ),
                  ),
                  if (after.weightKg != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('${after.weightKg} kg', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ),
          ],
        ),
      );
    } else if (_mode == CompareMode.slider) {
      // Interactive Drag Divider Split Screen
      return LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;

          return Padding(
            padding: const EdgeInsets.all(16),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: GestureDetector(
                onHorizontalDragUpdate: (details) {
                  setState(() {
                    _sliderPosition = (_sliderPosition + details.delta.dx / width).clamp(0.05, 0.95);
                  });
                },
                child: Stack(
                  children: [
                    // After Photo (Background base)
                    Positioned.fill(
                      child: _buildPhotoWidget(after),
                    ),
                    // Before Photo (Clipped on the left)
                    Positioned.fill(
                      child: ClipRect(
                        clipper: _SplitClipper(_sliderPosition),
                        child: _buildPhotoWidget(before),
                      ),
                    ),
                    // Divider Line
                    Positioned(
                      left: (width * _sliderPosition) - 1.5,
                      top: 0,
                      bottom: 0,
                      child: Container(
                        width: 3,
                        color: Colors.white,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: AppColors.progressIndigo,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.compare_arrows, size: 18, color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                    // Floating Labels
                    Positioned(
                      left: 12,
                      top: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(8)),
                        child: Text(
                          'Before: ${DateFormatters.formatShortDate(before.date)}',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 12,
                      top: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(8)),
                        child: Text(
                          'After: ${DateFormatters.formatShortDate(after.date)}',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    } else {
      // Timeline Scrubber
      final maxIdx = (allAnglePhotos.length - 1).toDouble();
      final currentScrubPhoto = allAnglePhotos[_scrubValue.round().clamp(0, allAnglePhotos.length - 1)];

      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: _buildPhotoWidget(currentScrubPhoto),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Date: ${DateFormatters.formatFullDate(currentScrubPhoto.date)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            if (currentScrubPhoto.notes.isNotEmpty)
              Text(
                currentScrubPhoto.notes,
                style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
              ),
            const SizedBox(height: 10),
            Slider(
              value: _scrubValue.clamp(0.0, maxIdx),
              min: 0.0,
              max: maxIdx > 0 ? maxIdx : 1.0,
              divisions: maxIdx > 0 ? maxIdx.toInt() : 1,
              activeColor: AppColors.progressIndigo,
              onChanged: (val) {
                setState(() => _scrubValue = val);
              },
            ),
          ],
        ),
      );
    }
  }

  Widget _buildPhotoWidget(ProgressPhoto photo, {double? height}) {
    final file = File(photo.filePath);
    if (file.existsSync()) {
      return Image.file(
        file,
        height: height,
        width: double.infinity,
        fit: BoxFit.cover,
      );
    }
    return Container(
      height: height,
      color: AppColors.darkSurfaceVariant,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.accessibility_new, size: 48, color: AppColors.progressIndigo),
            const SizedBox(height: 8),
            Text(
              photo.category.displayName,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(
              DateFormatters.formatShortDate(photo.date),
              style: const TextStyle(fontSize: 11, color: AppColors.darkTextMuted),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModeTab(CompareMode m, String label, IconData icon, bool isDark) {
    final isSel = _mode == m;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _mode = m),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSel
                ? AppColors.progressIndigo.withAlpha(isDark ? 40 : 25)
                : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSel ? AppColors.progressIndigo : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: isSel ? AppColors.progressIndigo : AppColors.darkTextMuted),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                  color: isSel
                      ? AppColors.progressIndigo
                      : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SplitClipper extends CustomClipper<Rect> {
  final double fraction;
  _SplitClipper(this.fraction);

  @override
  Rect getClip(Size size) {
    return Rect.fromLTWH(0, 0, size.width * fraction, size.height);
  }

  @override
  bool shouldReclip(covariant _SplitClipper oldClipper) => oldClipper.fraction != fraction;
}
