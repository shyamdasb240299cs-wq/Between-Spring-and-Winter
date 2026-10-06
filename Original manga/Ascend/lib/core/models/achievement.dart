class Achievement {
  final String id;
  final String title;
  final String description;
  final String iconEmoji;
  final String category;
  final bool isUnlocked;
  final DateTime? unlockedAt;
  final int currentProgress;
  final int maxProgress;

  const Achievement({
    required this.id,
    required this.title,
    required this.description,
    required this.iconEmoji,
    required this.category,
    this.isUnlocked = false,
    this.unlockedAt,
    this.currentProgress = 0,
    required this.maxProgress,
  });

  double get progressPercentage => (currentProgress / maxProgress).clamp(0.0, 1.0);

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'iconEmoji': iconEmoji,
      'category': category,
      'isUnlocked': isUnlocked,
      'unlockedAt': unlockedAt?.toIso8601String(),
      'currentProgress': currentProgress,
      'maxProgress': maxProgress,
    };
  }

  factory Achievement.fromMap(Map<dynamic, dynamic> map) {
    return Achievement(
      id: map['id'] as String? ?? '',
      title: map['title'] as String? ?? '',
      description: map['description'] as String? ?? '',
      iconEmoji: map['iconEmoji'] as String? ?? '🏆',
      category: map['category'] as String? ?? 'General',
      isUnlocked: map['isUnlocked'] as bool? ?? false,
      unlockedAt: map['unlockedAt'] != null
          ? DateTime.tryParse(map['unlockedAt'].toString())
          : null,
      currentProgress: (map['currentProgress'] as num?)?.toInt() ?? 0,
      maxProgress: (map['maxProgress'] as num?)?.toInt() ?? 1,
    );
  }

  Achievement copyWith({
    String? id,
    String? title,
    String? description,
    String? iconEmoji,
    String? category,
    bool? isUnlocked,
    DateTime? unlockedAt,
    int? currentProgress,
    int? maxProgress,
  }) {
    return Achievement(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      iconEmoji: iconEmoji ?? this.iconEmoji,
      category: category ?? this.category,
      isUnlocked: isUnlocked ?? this.isUnlocked,
      unlockedAt: unlockedAt ?? this.unlockedAt,
      currentProgress: currentProgress ?? this.currentProgress,
      maxProgress: maxProgress ?? this.maxProgress,
    );
  }
}
