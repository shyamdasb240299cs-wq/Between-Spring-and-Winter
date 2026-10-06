enum PhotoCategory {
  front,
  leftSide,
  rightSide,
  back;

  String get displayName {
    switch (this) {
      case PhotoCategory.front:
        return 'Front';
      case PhotoCategory.leftSide:
        return 'Left Side';
      case PhotoCategory.rightSide:
        return 'Right Side';
      case PhotoCategory.back:
        return 'Back';
    }
  }
}

class ProgressPhoto {
  final String id;
  final String filePath;
  final PhotoCategory category;
  final DateTime date;
  final String notes;
  final double? weightKg;

  const ProgressPhoto({
    required this.id,
    required this.filePath,
    required this.category,
    required this.date,
    this.notes = '',
    this.weightKg,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'filePath': filePath,
      'category': category.name,
      'date': date.toIso8601String(),
      'notes': notes,
      'weightKg': weightKg,
    };
  }

  factory ProgressPhoto.fromMap(Map<dynamic, dynamic> map) {
    return ProgressPhoto(
      id: map['id'] as String? ?? '',
      filePath: map['filePath'] as String? ?? '',
      category: PhotoCategory.values.firstWhere(
        (e) => e.name == map['category'],
        orElse: () => PhotoCategory.front,
      ),
      date: map['date'] != null
          ? DateTime.tryParse(map['date'].toString()) ?? DateTime.now()
          : DateTime.now(),
      notes: map['notes'] as String? ?? '',
      weightKg: (map['weightKg'] as num?)?.toDouble(),
    );
  }
}
