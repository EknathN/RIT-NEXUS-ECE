class PostModel {
  final String id;
  final String authorId;
  final String authorName;
  final String authorHeadline;
  final String authorAvatar;
  final String authorRole;
  final String content;
  final List<String> tags;
  final int likesCount;
  final int commentsCount;
  final String? mediaUrl;
  final bool hasLiked;
  final DateTime createdAt;

  PostModel({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.authorHeadline,
    required this.authorAvatar,
    required this.authorRole,
    required this.content,
    required this.tags,
    required this.likesCount,
    required this.commentsCount,
    this.mediaUrl,
    this.hasLiked = false,
    required this.createdAt,
  });

  factory PostModel.fromJson(Map<String, dynamic> json) {
    // Author might be a nested object or flattened
    final authorObj = json['author'] as Map<String, dynamic>?;
    final authorName = authorObj != null
        ? (authorObj['full_name'] ?? authorObj['name'] ?? 'ECE Member')
        : (json['author_name'] ?? 'ECE Member');
    final authorHeadline = authorObj != null
        ? (authorObj['headline'] ?? 'ECE Community')
        : (json['author_headline'] ?? 'ECE Community');
    final authorAvatar = authorObj != null
        ? (authorObj['avatar_url'] ?? authorObj['avatar'] ?? '')
        : (json['author_avatar'] ?? '');
    final authorRole = authorObj != null
        ? (authorObj['role'] ?? 'student')
        : (json['author_role'] ?? 'student');

    List<String> parsedTags = [];
    if (json['tags'] is List) {
      parsedTags = (json['tags'] as List).map((e) => e.toString()).toList();
    }

    return PostModel(
      id: json['id']?.toString() ?? '',
      authorId: json['author_id']?.toString() ?? authorObj?['id']?.toString() ?? '',
      authorName: authorName.toString(),
      authorHeadline: authorHeadline.toString(),
      authorAvatar: authorAvatar.toString(),
      authorRole: authorRole.toString(),
      content: json['content']?.toString() ?? '',
      tags: parsedTags,
      likesCount: json['likes_count'] is int ? json['likes_count'] : int.tryParse(json['likes_count']?.toString() ?? '0') ?? 0,
      commentsCount: json['comments_count'] is int ? json['comments_count'] : int.tryParse(json['comments_count']?.toString() ?? '0') ?? 0,
      mediaUrl: json['media_url']?.toString() ?? (json['media'] is List && (json['media'] as List).isNotEmpty ? json['media'][0]['media_url'] : null),
      hasLiked: json['has_liked'] == true,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }
}
