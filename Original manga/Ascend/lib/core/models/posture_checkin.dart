enum PostureRating {
  good,
  okay,
  poor;

  String get emoji {
    switch (this) {
      case PostureRating.good:
        return '🙂';
      case PostureRating.okay:
        return '😐';
      case PostureRating.poor:
        return '😣';
    }
  }

  String get displayName {
    switch (this) {
      case PostureRating.good:
        return 'Good';
      case PostureRating.okay:
        return 'Okay';
      case PostureRating.poor:
        return 'Poor';
    }
  }
}

class PostureCheckin {
  final String id;
  final DateTime timestamp;
  final PostureRating rating;
  final String note;

  const PostureCheckin({
    required this.id,
    required this.timestamp,
    required this.rating,
    this.note = '',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'timestamp': timestamp.toIso8601String(),
      'rating': rating.name,
      'note': note,
    };
  }

  factory PostureCheckin.fromMap(Map<dynamic, dynamic> map) {
    return PostureCheckin(
      id: map['id'] as String? ?? '',
      timestamp: map['timestamp'] != null
          ? DateTime.tryParse(map['timestamp'].toString()) ?? DateTime.now()
          : DateTime.now(),
      rating: PostureRating.values.firstWhere(
        (e) => e.name == map['rating'],
        orElse: () => PostureRating.okay,
      ),
      note: map['note'] as String? ?? '',
    );
  }
}
