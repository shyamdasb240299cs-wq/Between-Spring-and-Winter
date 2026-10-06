import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import 'package:ascend/core/constants/app_colors.dart';
import 'package:ascend/core/constants/app_typography.dart';
import 'package:ascend/core/models/progress_photo.dart';
import 'package:ascend/core/widgets/custom_app_bar.dart';
import 'package:ascend/core/widgets/module_card.dart';
import 'package:ascend/features/progress/state/progress_providers.dart';
import 'package:ascend/features/settings/state/settings_providers.dart';

class AddPhotoScreen extends ConsumerStatefulWidget {
  const AddPhotoScreen({super.key});

  @override
  ConsumerState<AddPhotoScreen> createState() => _AddPhotoScreenState();
}

class _AddPhotoScreenState extends ConsumerState<AddPhotoScreen> {
  final ImagePicker _picker = ImagePicker();
  File? _imageFile;
  PhotoCategory _selectedCategory = PhotoCategory.front;
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _weightController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final profile = ref.read(userProfileProvider);
    _weightController.text = profile.weightKg.toString();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1200,
      );
      if (picked != null) {
        setState(() {
          _imageFile = File(picked.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not access camera/gallery: $e')),
        );
      }
    }
  }

  Future<void> _savePhoto() async {
    if (_imageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or capture a photo first.')),
      );
      return;
    }

    try {
      // Copy to persistent application documents directory
      final appDir = await getApplicationDocumentsDirectory();
      final photosDir = Directory('${appDir.path}/progress_photos');
      if (!await photosDir.exists()) {
        await photosDir.create(recursive: true);
      }

      final fileName = 'photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final savedImage = await _imageFile!.copy('${photosDir.path}/$fileName');

      final newPhoto = ProgressPhoto(
        id: const Uuid().v4(),
        filePath: savedImage.path,
        date: DateTime.now(),
        category: _selectedCategory,
        notes: _notesController.text.trim(),
        weightKg: double.tryParse(_weightController.text),
      );

      await ref.read(progressPhotosProvider.notifier).addPhoto(newPhoto);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Progress photo saved to local vault!')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving photo: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'New Progress Photo',
        subtitle: 'Local-first private timeline capture',
        accentColor: AppColors.progressIndigo,
        actions: [
          TextButton(
            onPressed: _savePhoto,
            child: const Text('Save', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.progressIndigo)),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Photo Angle Selection Chips
              Text(
                'Select Pose Angle',
                style: isDark ? AppTypography.headingSmallDark : AppTypography.headingSmallLight,
              ),
              const SizedBox(height: 8),

              Row(
                children: PhotoCategory.values.map((cat) {
                  final isSel = _selectedCategory == cat;
                  return Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: cat != PhotoCategory.back ? 6 : 0),
                      child: InkWell(
                        onTap: () => setState(() => _selectedCategory = cat),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: isSel
                                ? AppColors.progressIndigo
                                : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSel ? AppColors.progressIndigo : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                            ),
                          ),
                          child: Center(
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
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // Image Preview or Placeholder Canvas
              ModuleCard(
                accentColor: AppColors.progressIndigo,
                padding: EdgeInsets.zero,
                child: Container(
                  height: 280,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: _imageFile != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.file(_imageFile!, fit: BoxFit.cover),
                        )
                      : Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.camera_alt_outlined, size: 54, color: AppColors.progressIndigo),
                              const SizedBox(height: 12),
                              Text(
                                'Capture or choose ${_selectedCategory.displayName} photo',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Consistent lighting & natural standing posture',
                                style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted),
                              ),
                              const SizedBox(height: 16),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.progressIndigo),
                                    onPressed: () => _pickImage(ImageSource.camera),
                                    icon: const Icon(Icons.camera_alt),
                                    label: const Text('Camera'),
                                  ),
                                  const SizedBox(width: 12),
                                  OutlinedButton.icon(
                                    onPressed: () => _pickImage(ImageSource.gallery),
                                    icon: const Icon(Icons.photo_library),
                                    label: const Text('Gallery'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 16),

              // Weight at time of photo
              TextField(
                controller: _weightController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Body Weight at Check-in (kg)',
                  suffixText: 'kg',
                ),
              ),
              const SizedBox(height: 12),

              // Notes
              TextField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Notes / Observations (optional)',
                  hintText: 'e.g. Spine feels more upright, shoulders wider',
                ),
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.progressIndigo,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _savePhoto,
                  child: const Text('Save to Private Vault', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
