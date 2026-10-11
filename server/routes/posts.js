import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findOne, findWhere, insert, update, remove, count } from '../db/schema.js';

const router = express.Router();

// Get feed posts
// Helper function to enrich post with author, reactions, saved state, and all comments
function enrichPost(post, currentUserId) {
  const author = findById('users', post.user_id);
  const userReaction = findOne('reactions', { post_id: post.id, user_id: currentUserId });
  const isSaved = !!findOne('saved_posts', { post_id: post.id, user_id: currentUserId });
  const allComments = findAll('comments', { post_id: post.id })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  const comments = allComments.map(c => {
    const commentAuthor = findById('users', c.user_id);
    const commentLikes = findAll('reactions', { comment_id: c.id });
    const isCommentLiked = !!findOne('reactions', { comment_id: c.id, user_id: currentUserId });
    return {
      ...c,
      _id: c.id,
      likes_count: (c.likes_count || 0) + commentLikes.length,
      isLiked: isCommentLiked,
      author: commentAuthor ? {
        id: commentAuthor.id,
        _id: commentAuthor.id,
        full_name: commentAuthor.full_name,
        fullName: commentAuthor.full_name,
        profile_photo: commentAuthor.profile_photo,
        avatar: commentAuthor.profile_photo,
        headline: commentAuthor.headline,
        verification_status: commentAuthor.verification_status,
      } : null,
    };
  });

  const allReactions = findAll('reactions', { post_id: post.id });
  const reactionCounts = {};
  allReactions.forEach(r => {
    reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
  });

  return {
    ...post,
    _id: post.id,
    author: author ? {
      id: author.id,
      _id: author.id,
      full_name: author.full_name,
      fullName: author.full_name,
      profile_photo: author.profile_photo,
      avatar: author.profile_photo,
      headline: author.headline,
      verification_status: author.verification_status,
      account_type: author.account_type,
    } : null,
    userReaction: userReaction ? userReaction.type : null,
    isSaved,
    comments,
    reactionCounts,
    totalComments: allComments.length,
  };
}

// Get saved posts for current user
router.get('/saved', (req, res) => {
  try {
    const savedRecords = findAll('saved_posts', { user_id: req.user.id });
    const savedPostIds = new Set(savedRecords.map(s => s.post_id));
    let posts = findAll('posts').filter(p => savedPostIds.has(p.id));
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const enrichedPosts = posts.map(post => enrichPost(post, req.user.id));
    res.json({ posts: enrichedPosts, total: enrichedPosts.length });
  } catch (err) {
    console.error('Get saved posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get feed posts
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, community_id, saved, user_id } = req.query;
    let posts = findAll('posts');
    
    if (saved === 'true') {
      const savedRecords = findAll('saved_posts', { user_id: req.user.id });
      const savedPostIds = new Set(savedRecords.map(s => s.post_id));
      posts = posts.filter(p => savedPostIds.has(p.id));
    } else if (user_id) {
      posts = posts.filter(p => p.user_id === user_id);
    } else if (community_id) {
      posts = posts.filter(p => p.community_id === community_id);
    } else {
      posts = posts.filter(p => !p.community_id);
    }
    
    // Sort by created_at desc
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Pinned first
    posts.sort((a, b) => (b.is_pinned || 0) - (a.is_pinned || 0));
    
    const total = posts.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    posts = posts.slice(start, start + parseInt(limit));
    
    const enrichedPosts = posts.map(post => enrichPost(post, req.user.id));
    
    res.json({ posts: enrichedPosts, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post
router.post('/', (req, res) => {
  try {
    const { content, post_type, media, document_name, file_name, community_id } = req.body;
    
    if (!content && !media) {
      return res.status(400).json({ error: 'Post must have content or media' });
    }
    
    const post = {
      id: uuidv4(),
      user_id: req.user.id,
      content: content || '',
      post_type: post_type || (media ? 'media' : 'text'),
      media: media || '',
      document_name: document_name || file_name || '',
      is_pinned: 0,
      is_announcement: 0,
      community_id: community_id || null,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    insert('posts', post);
    res.status(201).json(enrichPost(post, req.user.id));
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// React to post
const handlePostReaction = (req, res) => {
  try {
    const { type = 'like' } = req.body || {};
    const post = findById('posts', req.params.id) || findOne('posts', { id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const existing = findOne('reactions', { post_id: post.id, user_id: req.user.id });
    
    if (existing) {
      if (existing.type === type) {
        // Toggle off reaction
        remove('reactions', existing.id);
        const newLikes = Math.max(0, (post.likes_count || 1) - 1);
        update('posts', post.id, { likes_count: newLikes });
        return res.json({ removed: true, likes_count: newLikes, success: true });
      } else {
        // Change reaction type
        update('reactions', existing.id, { type });
        return res.json({ type, likes_count: post.likes_count || 1, success: true });
      }
    }
    
    const reaction = {
      id: uuidv4(),
      user_id: req.user.id,
      post_id: post.id,
      type: type || 'like',
      created_at: new Date().toISOString(),
    };
    insert('reactions', reaction);
    const newLikes = (post.likes_count || 0) + 1;
    update('posts', post.id, { likes_count: newLikes });
    
    // Create notification
    if (post.user_id !== req.user.id) {
      const reactor = findById('users', req.user.id);
      const reactorName = reactor ? (reactor.full_name || reactor.fullName) : 'An ECE member';
      insert('notifications', {
        id: uuidv4(),
        user_id: post.user_id,
        from_user_id: req.user.id,
        type: 'reaction',
        title: 'New Reaction',
        message: `${reactorName} reacted to your post`,
        link: `/home`,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }
    
    res.json({ type: type || 'like', likes_count: newLikes, success: true });
  } catch (err) {
    console.error('React error:', err);
    res.status(500).json({ error: 'Server error reacting to post' });
  }
};
router.post('/:id/react', handlePostReaction);
router.post('/:id/like', handlePostReaction);

// Comment on post
router.post(['/:id/comments', '/:id/comment'], (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment content is required' });
    
    const post = findById('posts', req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    const comment = {
      id: uuidv4(),
      user_id: req.user.id,
      post_id: req.params.id,
      parent_id: req.body.parent_id || null,
      content,
      created_at: new Date().toISOString(),
    };
    insert('comments', comment);
    update('posts', post.id, { comments_count: (post.comments_count || 0) + 1 });
    
    const author = findById('users', req.user.id);
    
    // Create notification
    if (post.user_id !== req.user.id) {
      insert('notifications', {
        id: uuidv4(),
        user_id: post.user_id,
        from_user_id: req.user.id,
        type: 'comment',
        title: 'New Comment',
        message: `${author.full_name} commented on your post`,
        link: `/post/${post.id}`,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }
    
    res.status(201).json({
      ...comment,
      author: {
        id: author.id,
        full_name: author.full_name,
        profile_photo: author.profile_photo,
        headline: author.headline,
        verification_status: author.verification_status,
      },
    });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for post
router.get(['/:id/comments', '/:id/comment'], (req, res) => {
  try {
    const comments = findAll('comments', { post_id: req.params.id })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(c => {
        const author = findById('users', c.user_id);
        return {
          ...c,
          author: author ? {
            id: author.id,
            full_name: author.full_name,
            profile_photo: author.profile_photo,
            headline: author.headline,
            verification_status: author.verification_status,
          } : null,
        };
      });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Save/unsave post
router.post('/:id/save', (req, res) => {
  try {
    const existing = findOne('saved_posts', { post_id: req.params.id, user_id: req.user.id });
    if (existing) {
      remove('saved_posts', existing.id);
      return res.json({ saved: false });
    }
    insert('saved_posts', {
      id: uuidv4(),
      user_id: req.user.id,
      post_id: req.params.id,
      created_at: new Date().toISOString(),
    });
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit post (only author or admin, and only within 1 hour of creation)
router.put('/:id', (req, res) => {
  try {
    const post = findById('posts', req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    // Check if within 1 hour (3600000 ms)
    const postTime = new Date(post.created_at).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (req.user.role !== 'admin' && (now - postTime > oneHour)) {
      return res.status(400).json({ error: 'Posts can only be edited within 1 hour of publishing' });
    }

    const { content, media, post_type, document_name } = req.body;
    const updates = {
      updated_at: new Date().toISOString(),
      is_edited: 1,
    };
    if (content !== undefined) updates.content = content;
    if (media !== undefined) updates.media = media;
    if (post_type !== undefined) updates.post_type = post_type;
    if (document_name !== undefined) updates.document_name = document_name;

    update('posts', post.id, updates);
    const updatedPost = findById('posts', post.id);
    res.json(enrichPost(updatedPost, req.user.id));
  } catch (err) {
    console.error('Edit post error:', err);
    res.status(500).json({ error: 'Server error editing post' });
  }
});

// Delete post
router.delete('/:id', (req, res) => {
  try {
    const post = findById('posts', req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    remove('posts', req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment
router.delete(['/:postId/comments/:commentId', '/comments/:commentId'], (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.postId;
    const comment = findById('comments', commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    
    const post = findById('posts', comment.post_id);
    if (comment.user_id !== req.user.id && (!post || post.user_id !== req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    remove('comments', comment.id);
    if (post) {
      update('posts', post.id, { comments_count: Math.max(0, (post.comments_count || 1) - 1) });
    }
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting comment' });
  }
});

// Like / unlike comment
router.post(['/:postId/comments/:commentId/like', '/comments/:commentId/like'], (req, res) => {
  try {
    const commentId = req.params.commentId || req.params.postId;
    const comment = findById('comments', commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    
    const existing = findOne('reactions', { comment_id: comment.id, user_id: req.user.id });
    if (existing) {
      remove('reactions', existing.id);
      const likes_count = Math.max(0, (comment.likes_count || 1) - 1);
      update('comments', comment.id, { likes_count });
      return res.json({ liked: false, likes_count });
    }
    insert('reactions', {
      id: uuidv4(),
      user_id: req.user.id,
      comment_id: comment.id,
      type: 'like',
      created_at: new Date().toISOString()
    });
    const likes_count = (comment.likes_count || 0) + 1;
    update('comments', comment.id, { likes_count });
    res.json({ liked: true, likes_count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Share post
router.post('/:id/share', (req, res) => {
  try {
    const post = findById('posts', req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const shares_count = (post.shares_count || 0) + 1;
    update('posts', post.id, { shares_count });
    res.json({ shared: true, shares_count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
