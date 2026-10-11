import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/post_model.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class HomeFeedScreen extends StatefulWidget {
  const HomeFeedScreen({super.key});

  @override
  State<HomeFeedScreen> createState() => _HomeFeedScreenState();
}

class _HomeFeedScreenState extends State<HomeFeedScreen> {
  List<PostModel> _posts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPosts();
  }

  Future<void> _loadPosts() async {
    setState(() => _isLoading = true);
    final posts = await ApiService().getPosts();
    if (mounted) {
      setState(() {
        _posts = posts;
        _isLoading = false;
      });
    }
  }

  void _showCreatePostModal() {
    final contentController = TextEditingController();
    final tagsController = TextEditingController(text: '#VLSI, #RITECE');
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.secondaryDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Publish ECE Post',
                    style: TextStyle(color: AppTheme.textLight, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: AppTheme.textMuted),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: contentController,
                maxLines: 4,
                style: const TextStyle(color: AppTheme.textLight),
                decoration: const InputDecoration(
                  hintText: 'Share technical project updates, research findings, or alumni opportunities...',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: tagsController,
                style: const TextStyle(color: AppTheme.textLight),
                decoration: const InputDecoration(
                  labelText: 'Tags (comma separated)',
                  hintText: '#EmbeddedSystems, #FPGA, #IoT',
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: isSubmitting
                    ? null
                    : () async {
                        final text = contentController.text.trim();
                        if (text.isEmpty) return;
                        setModalState(() => isSubmitting = true);

                        final tags = tagsController.text
                            .split(',')
                            .map((t) => t.trim())
                            .where((t) => t.isNotEmpty)
                            .toList();

                        final newPost = await ApiService().createPost(text, tags);
                        if (mounted) {
                          setState(() {
                            _posts.insert(0, newPost);
                          });
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Post published to RIT ECE Network!')),
                          );
                        }
                      },
                child: isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryDark),
                      )
                    : const Text('Publish Post'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.accentCyan.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.memory, color: AppTheme.accentCyan, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('RIT ECE Feed'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.textMuted),
            onPressed: _loadPosts,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.accentCyan,
        foregroundColor: AppTheme.primaryDark,
        onPressed: _showCreatePostModal,
        child: const Icon(Icons.add_comment),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accentCyan))
          : RefreshIndicator(
              color: AppTheme.accentCyan,
              onRefresh: _loadPosts,
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                itemCount: _posts.length,
                itemBuilder: (context, index) {
                  final post = _posts[index];
                  return _PostCard(
                    post: post,
                    onLikeToggle: () async {
                      await ApiService().likePost(post.id);
                      setState(() {
                        // Optimistic update
                        _posts[index] = PostModel(
                          id: post.id,
                          authorId: post.authorId,
                          authorName: post.authorName,
                          authorHeadline: post.authorHeadline,
                          authorAvatar: post.authorAvatar,
                          authorRole: post.authorRole,
                          content: post.content,
                          tags: post.tags,
                          likesCount: post.hasLiked ? post.likesCount - 1 : post.likesCount + 1,
                          commentsCount: post.commentsCount,
                          mediaUrl: post.mediaUrl,
                          hasLiked: !post.hasLiked,
                          createdAt: post.createdAt,
                        );
                      });
                    },
                  );
                },
              ),
            ),
    );
  }
}

class _PostCard extends StatelessWidget {
  final PostModel post;
  final VoidCallback onLikeToggle;

  const _PostCard({required this.post, required this.onLikeToggle});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderDark),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Author Header
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppTheme.secondaryDark,
                child: Text(
                  post.authorName.isNotEmpty ? post.authorName[0].toUpperCase() : 'E',
                  style: const TextStyle(color: AppTheme.accentCyan, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            post.authorName,
                            style: const TextStyle(
                              color: AppTheme.textLight,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        _roleBadge(post.authorRole),
                      ],
                    ),
                    Text(
                      post.authorHeadline,
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Text(
                DateFormat.MMMd().format(post.createdAt),
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Post Content
          Text(
            post.content,
            style: const TextStyle(color: AppTheme.textLight, fontSize: 14, height: 1.45),
          ),
          const SizedBox(height: 10),

          // Tags
          if (post.tags.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: post.tags.map((tag) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.accentCyan.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.accentCyan.withOpacity(0.3)),
                  ),
                  child: Text(
                    tag.startsWith('#') ? tag : '#$tag',
                    style: const TextStyle(
                      color: AppTheme.accentCyan,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                );
              }).toList(),
            ),
          const SizedBox(height: 14),

          const Divider(color: AppTheme.borderDark, height: 1),
          const SizedBox(height: 8),

          // Action Buttons: Like, Comment
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              InkWell(
                onTap: onLikeToggle,
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Row(
                    children: [
                      Icon(
                        post.hasLiked ? Icons.favorite : Icons.favorite_border,
                        size: 18,
                        color: post.hasLiked ? Colors.redAccent : AppTheme.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${post.likesCount}',
                        style: TextStyle(
                          color: post.hasLiked ? Colors.redAccent : AppTheme.textMuted,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(
                  children: [
                    const Icon(Icons.chat_bubble_outline, size: 18, color: AppTheme.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      '${post.commentsCount}',
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Icon(Icons.share_outlined, size: 18, color: AppTheme.textMuted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _roleBadge(String role) {
    Color bg;
    Color fg;
    String label;

    switch (role.toLowerCase()) {
      case 'alumni':
        bg = const Color(0xFF7928CA).withOpacity(0.2);
        fg = const Color(0xFFA855F7);
        label = 'Alumni';
        break;
      case 'faculty':
        bg = Colors.amber.withOpacity(0.2);
        fg = Colors.amber;
        label = 'Faculty';
        break;
      case 'admin':
        bg = Colors.redAccent.withOpacity(0.2);
        fg = Colors.redAccent;
        label = 'Admin';
        break;
      default:
        bg = AppTheme.accentCyan.withOpacity(0.2);
        fg = AppTheme.accentCyan;
        label = 'Student';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(color: fg, fontSize: 9.5, fontWeight: FontWeight.bold),
      ),
    );
  }
}
