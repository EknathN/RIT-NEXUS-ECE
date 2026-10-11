class MessageModel {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderName;
  final String content;
  final bool isRead;
  final DateTime createdAt;

  MessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderName,
    required this.content,
    this.isRead = false,
    required this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id']?.toString() ?? '',
      conversationId: json['conversation_id']?.toString() ?? '',
      senderId: json['sender_id']?.toString() ?? '',
      senderName: json['sender_name']?.toString() ?? 'User',
      content: json['content']?.toString() ?? '',
      isRead: json['is_read'] == true,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }
}

class ConversationModel {
  final String id;
  final String title;
  final String otherUserName;
  final String otherUserAvatar;
  final String otherUserHeadline;
  final String lastMessage;
  final int unreadCount;
  final DateTime updatedAt;

  ConversationModel({
    required this.id,
    required this.title,
    required this.otherUserName,
    required this.otherUserAvatar,
    required this.otherUserHeadline,
    required this.lastMessage,
    this.unreadCount = 0,
    required this.updatedAt,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json, String currentUserId) {
    String otherName = 'ECE Colleague';
    String otherAvatar = '';
    String otherHeadline = 'ECE Member';

    if (json['members'] is List) {
      final members = json['members'] as List;
      final other = members.firstWhere(
        (m) => m['id']?.toString() != currentUserId,
        orElse: () => null,
      );
      if (other != null) {
        otherName = other['full_name'] ?? other['name'] ?? otherName;
        otherAvatar = other['avatar_url'] ?? other['avatar'] ?? otherAvatar;
        otherHeadline = other['headline'] ?? otherHeadline;
      }
    } else if (json['other_user'] is Map) {
      final other = json['other_user'];
      otherName = other['full_name'] ?? other['name'] ?? otherName;
      otherAvatar = other['avatar_url'] ?? other['avatar'] ?? otherAvatar;
      otherHeadline = other['headline'] ?? otherHeadline;
    }

    return ConversationModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? otherName,
      otherUserName: otherName,
      otherUserAvatar: otherAvatar,
      otherUserHeadline: otherHeadline,
      lastMessage: json['last_message']?['content']?.toString() ?? json['last_message_text']?.toString() ?? 'Started conversation',
      unreadCount: json['unread_count'] is int ? json['unread_count'] : 0,
      updatedAt: json['updated_at'] != null ? DateTime.tryParse(json['updated_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }
}
