class DailyNote {
  final String id;
  final String dateString; // YYYY-MM-DD
  final String content;
  final List<String> tags;
  final DateTime updatedAt;

  const DailyNote({
    required this.id,
    required this.dateString,
    required this.content,
    this.tags = const [],
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'dateString': dateString,
      'content': content,
      'tags': tags,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory DailyNote.fromMap(Map<dynamic, dynamic> map) {
    return DailyNote(
      id: map['id'] as String? ?? '',
      dateString: map['dateString'] as String? ?? '',
      content: map['content'] as String? ?? '',
      tags: (map['tags'] as List?)?.map((e) => e.toString()).toList() ?? [],
      updatedAt: map['updatedAt'] != null
          ? DateTime.tryParse(map['updatedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  DailyNote copyWith({
    String? id,
    String? dateString,
    String? content,
    List<String>? tags,
    DateTime? updatedAt,
  }) {
    return DailyNote(
      id: id ?? this.id,
      dateString: dateString ?? this.dateString,
      content: content ?? this.content,
      tags: tags ?? this.tags,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
