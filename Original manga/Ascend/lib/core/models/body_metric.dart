class BodyMetric {
  final String id;
  final DateTime date;
  final double weightKg;
  final double? waistCm;
  final double? chestCm;
  final double? armsCm;
  final double? thighsCm;
  final double? bodyFatPercentage;
  final String notes;

  const BodyMetric({
    required this.id,
    required this.date,
    required this.weightKg,
    this.waistCm,
    this.chestCm,
    this.armsCm,
    this.thighsCm,
    this.bodyFatPercentage,
    this.notes = '',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'date': date.toIso8601String(),
      'weightKg': weightKg,
      'waistCm': waistCm,
      'chestCm': chestCm,
      'armsCm': armsCm,
      'thighsCm': thighsCm,
      'bodyFatPercentage': bodyFatPercentage,
      'notes': notes,
    };
  }

  factory BodyMetric.fromMap(Map<dynamic, dynamic> map) {
    return BodyMetric(
      id: map['id'] as String? ?? '',
      date: map['date'] != null
          ? DateTime.tryParse(map['date'].toString()) ?? DateTime.now()
          : DateTime.now(),
      weightKg: (map['weightKg'] as num?)?.toDouble() ?? 0.0,
      waistCm: (map['waistCm'] as num?)?.toDouble(),
      chestCm: (map['chestCm'] as num?)?.toDouble(),
      armsCm: (map['armsCm'] as num?)?.toDouble(),
      thighsCm: (map['thighsCm'] as num?)?.toDouble(),
      bodyFatPercentage: (map['bodyFatPercentage'] as num?)?.toDouble(),
      notes: map['notes'] as String? ?? '',
    );
  }
}
