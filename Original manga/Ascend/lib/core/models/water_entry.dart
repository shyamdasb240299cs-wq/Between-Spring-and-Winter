class WaterEntry {
  final String id;
  final String dateString; // YYYY-MM-DD
  final int amountMl;
  final DateTime timestamp;

  const WaterEntry({
    required this.id,
    required this.dateString,
    required this.amountMl,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'dateString': dateString,
      'amountMl': amountMl,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory WaterEntry.fromMap(Map<dynamic, dynamic> map) {
    return WaterEntry(
      id: map['id'] as String? ?? '',
      dateString: map['dateString'] as String? ?? '',
      amountMl: (map['amountMl'] as num?)?.toInt() ?? 0,
      timestamp: map['timestamp'] != null
          ? DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
