import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findOne, findWhere, insert, update, remove } from '../db/schema.js';

const router = express.Router();

// Get all communities
router.get('/', (req, res) => {
  try {
    const { search: q } = req.query;
    let communities = findAll('communities').filter(c => c.is_approved !== 0);
    
    if (q) {
      const lower = q.toLowerCase();
      communities = communities.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        (c.description || '').toLowerCase().includes(lower) ||
        (c.category || '').toLowerCase().includes(lower)
      );
    }
    
    const enriched = communities.map(c => {
      const memberRows = findAll('community_members', { community_id: c.id });
      const memberIds = memberRows.map(m => m.user_id);
      const isMember = memberIds.includes(req.user.id);
      return { 
        ...c, 
        _id: c.id, 
        isMember, 
        members: memberIds,
        member_count: memberIds.length || c.member_count || 1 
      };
    });
    
    res.json({ communities: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get community by ID
router.get('/:id', (req, res) => {
  try {
    const community = findById('communities', req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    
    const memberRows = findAll('community_members', { community_id: req.params.id });
    const memberIds = memberRows.map(m => m.user_id);
    const members = memberRows.map(m => {
      const user = findById('users', m.user_id);
      return {
        ...m,
        user: user ? {
          id: user.id,
          full_name: user.full_name,
          profile_photo: user.profile_photo,
          headline: user.headline,
        } : null,
      };
    });
    
    const isMember = memberIds.includes(req.user.id);
    const posts = findAll('posts', { community_id: req.params.id })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(p => {
        const author = findById('users', p.user_id);
        return {
          ...p,
          _id: p.id,
          author: author ? {
            _id: author.id,
            id: author.id,
            fullName: author.full_name,
            full_name: author.full_name,
            avatar: author.profile_photo,
            profile_photo: author.profile_photo,
            role: author.role || author.account_type,
          } : null
        };
      });
    
    res.json({ ...community, _id: community.id, members: memberIds, memberDetails: members, isMember, posts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get community posts
router.get('/:id/posts', (req, res) => {
  try {
    const posts = findAll('posts', { community_id: req.params.id })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(p => {
        const author = findById('users', p.user_id);
        return {
          ...p,
          _id: p.id,
          author: author ? {
            _id: author.id,
            id: author.id,
            fullName: author.full_name,
            full_name: author.full_name,
            avatar: author.profile_photo,
            profile_photo: author.profile_photo,
            role: author.role || author.account_type,
          } : null
        };
      });
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post in community
router.post('/:id/posts', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    
    const post = {
      id: uuidv4(),
      user_id: req.user.id,
      community_id: req.params.id,
      content,
      post_type: 'community',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    insert('posts', post);
    
    const author = findById('users', req.user.id);
    const enriched = {
      ...post,
      _id: post.id,
      author: {
        _id: author.id,
        id: author.id,
        fullName: author.full_name,
        full_name: author.full_name,
        avatar: author.profile_photo,
        profile_photo: author.profile_photo,
        role: author.role || author.account_type,
      }
    };
    res.status(201).json({ post: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create community
router.post('/', (req, res) => {
  try {
    const community = {
      id: uuidv4(),
      created_by: req.user.id,
      ...req.body,
      member_count: 1,
      is_approved: req.user.role === 'admin' ? 1 : 0,
      created_at: new Date().toISOString(),
    };
    insert('communities', community);
    
    // Add creator as admin member
    insert('community_members', {
      id: uuidv4(),
      community_id: community.id,
      user_id: req.user.id,
      role: 'admin',
      created_at: new Date().toISOString(),
    });
    
    res.status(201).json(community);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Join community
router.post('/:id/join', (req, res) => {
  try {
    const existing = findOne('community_members', { community_id: req.params.id, user_id: req.user.id });
    if (existing) return res.status(400).json({ error: 'Already a member' });
    
    insert('community_members', {
      id: uuidv4(),
      community_id: req.params.id,
      user_id: req.user.id,
      role: 'member',
      created_at: new Date().toISOString(),
    });
    
    const community = findById('communities', req.params.id);
    update('communities', req.params.id, { member_count: (community.member_count || 0) + 1 });
    
    res.json({ joined: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave community
router.post('/:id/leave', (req, res) => {
  try {
    const membership = findOne('community_members', { community_id: req.params.id, user_id: req.user.id });
    if (!membership) return res.status(400).json({ error: 'Not a member' });
    
    remove('community_members', membership.id);
    const community = findById('communities', req.params.id);
    update('communities', req.params.id, { member_count: Math.max(0, (community.member_count || 1) - 1) });
    
    res.json({ left: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper to initialize default channels and starter messages for a community
function getOrCreateChannels(communityId) {
  let channels = findWhere('community_channels', c => c.community_id === communityId);
  if (channels.length === 0) {
    const defaultChannels = [
      {
        id: uuidv4(),
        community_id: communityId,
        slug: 'announcements',
        name: 'announcements',
        type: 'announcement',
        category: '📢 BROADCASTS',
        topic: 'Official circulars, faculty notices, and broadcast updates',
        is_default: 1,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        community_id: communityId,
        slug: 'general-chat',
        name: 'general-chat',
        type: 'text',
        category: '💬 TEXT CHANNELS',
        topic: 'General conversation, networking, and lab discussions',
        is_default: 1,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        community_id: communityId,
        slug: 'doubts-and-qa',
        name: 'doubts-and-qa',
        type: 'text',
        category: '💬 TEXT CHANNELS',
        topic: 'Ask technical questions, debug circuits, and get homework/lab help',
        is_default: 1,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        community_id: communityId,
        slug: 'resources-and-notes',
        name: 'resources-and-notes',
        type: 'text',
        category: '💬 TEXT CHANNELS',
        topic: 'Lab manuals, lecture notes, textbook PDFs, and cheat sheets',
        is_default: 1,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        community_id: communityId,
        slug: 'projects-and-collab',
        name: 'projects-and-collab',
        type: 'text',
        category: '💬 TEXT CHANNELS',
        topic: 'Team partner search, project showcase, and PCB/RTL code review',
        is_default: 1,
        created_at: new Date().toISOString()
      },
      {
        id: uuidv4(),
        community_id: communityId,
        slug: 'voice-lab-lounge',
        name: 'ECE Lab Study Lounge',
        type: 'voice',
        category: '🔊 VOICE CHANNELS',
        topic: 'Drop-in voice channel for collaborative studying and hackathon sprints',
        is_default: 1,
        created_at: new Date().toISOString()
      }
    ];

    defaultChannels.forEach(ch => insert('community_channels', ch));
    channels = defaultChannels;

    // Seed starter messages
    const users = findAll('users');
    const adminUser = users.find(u => u.role === 'admin') || users[0];
    const studentUser = users.find(u => u.role !== 'admin') || users[1] || adminUser;

    const annChannel = channels.find(c => c.slug === 'announcements');
    if (annChannel && adminUser) {
      insert('community_messages', {
        id: uuidv4(),
        community_id: communityId,
        channel_id: annChannel.id,
        user_id: adminUser.id,
        content: '📢 Welcome to the official community channel! All department notices, lab schedules, guest lectures, and internship alerts will be broadcast here. Make sure notifications are enabled.',
        type: 'announcement',
        reactions: { '🔥': [adminUser.id], '👍': [studentUser.id] },
        is_pinned: 1,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString()
      });
    }

    const genChannel = channels.find(c => c.slug === 'general-chat');
    if (genChannel && studentUser) {
      insert('community_messages', {
        id: uuidv4(),
        community_id: communityId,
        channel_id: genChannel.id,
        user_id: studentUser.id,
        content: 'Hey everyone! Excited to collaborate here. Has anyone started testing the RISC-V core on the Spartan-7 FPGA boards in Lab 3?',
        type: 'text',
        reactions: { '🚀': [studentUser.id] },
        is_pinned: 0,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      });
    }

    const resChannel = channels.find(c => c.slug === 'resources-and-notes');
    if (resChannel && adminUser) {
      insert('community_messages', {
        id: uuidv4(),
        community_id: communityId,
        channel_id: resChannel.id,
        user_id: adminUser.id,
        content: 'Shared the complete Verilog HDL synthesis cheat-sheet and Vivado 2024.1 setup guide for the upcoming semester labs.',
        type: 'file',
        attachment_name: 'Verilog_HDL_Synthesis_QuickRef.pdf',
        attachment_url: 'https://www.asic-world.com/verilog/syntax.html',
        reactions: { '❤️': [adminUser.id, studentUser.id], '💡': [studentUser.id] },
        is_pinned: 1,
        created_at: new Date(Date.now() - 3600000 * 5).toISOString()
      });
    }
  }
  return channels;
}

// Get community channels (grouped like Discord & WhatsApp channels)
router.get('/:id/channels', (req, res) => {
  try {
    const community = findById('communities', req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    const channels = getOrCreateChannels(req.params.id);
    res.json({ channels });
  } catch (err) {
    console.error('Get channels error:', err);
    res.status(500).json({ error: 'Server error fetching channels' });
  }
});

// Create new channel in community (admin/moderator feature)
router.post('/:id/channels', (req, res) => {
  try {
    const { name, type = 'text', category = '💬 TEXT CHANNELS', topic = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Channel name is required' });

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const newChannel = {
      id: uuidv4(),
      community_id: req.params.id,
      slug: slug || 'new-channel',
      name: name.trim(),
      type: type, // 'text' | 'announcement' | 'voice'
      category: category,
      topic: topic,
      created_by: req.user.id,
      created_at: new Date().toISOString()
    };
    insert('community_channels', newChannel);
    res.status(201).json({ channel: newChannel });
  } catch (err) {
    console.error('Create channel error:', err);
    res.status(500).json({ error: 'Server error creating channel' });
  }
});

// Get messages for a channel
router.get('/:id/channels/:channelId/messages', (req, res) => {
  try {
    const { channelId } = req.params;
    getOrCreateChannels(req.params.id); // ensure channels and sample data exist

    let msgs = findWhere('community_messages', m => m.community_id === req.params.id && (m.channel_id === channelId || m.channel_id === req.params.channelId));
    
    // Sort chronologically
    msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const enriched = msgs.map(m => {
      const author = findById('users', m.user_id);
      const authorName = author?.full_name || author?.fullName || author?.name || 'Community Member';
      return {
        ...m,
        _id: m.id,
        user_id: m.user_id,
        author: {
          id: m.user_id,
          _id: m.user_id,
          full_name: authorName,
          fullName: authorName,
          profile_photo: author?.profile_photo || author?.avatar || '',
          avatar: author?.profile_photo || author?.avatar || '',
          role: author?.role || author?.account_type || 'student',
          headline: author?.headline || ''
        }
      };
    });

    res.json({ messages: enriched });
  } catch (err) {
    console.error('Get channel messages error:', err);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

// Send message to channel
router.post('/:id/channels/:channelId/messages', (req, res) => {
  try {
    const { content, type = 'text', code_snippet = '', code_language = 'c', attachment_url = '', attachment_name = '', reply_to = null } = req.body;
    if (!content && !code_snippet && !attachment_url) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    const newMessage = {
      id: uuidv4(),
      community_id: req.params.id,
      channel_id: req.params.channelId,
      user_id: req.user.id,
      content: content || '',
      type, // 'text' | 'announcement' | 'code' | 'file' | 'image'
      code_snippet,
      code_language,
      attachment_url,
      attachment_name,
      reply_to,
      reactions: {},
      is_pinned: 0,
      created_at: new Date().toISOString()
    };

    insert('community_messages', newMessage);

    const author = findById('users', req.user.id);
    const authorName = author?.full_name || author?.fullName || author?.name || req.user.full_name || 'Community Member';
    const enriched = {
      ...newMessage,
      _id: newMessage.id,
      user_id: req.user.id,
      author: {
        id: req.user.id,
        _id: req.user.id,
        full_name: authorName,
        fullName: authorName,
        profile_photo: author?.profile_photo || author?.avatar || '',
        avatar: author?.profile_photo || author?.avatar || '',
        role: author?.role || author?.account_type || req.user.role || 'student',
        headline: author?.headline || ''
      }
    };

    // Emit real-time WebSocket event
    const io = req.app.get('io');
    if (io) {
      io.emit('community_message', {
        communityId: req.params.id,
        channelId: req.params.channelId,
        message: enriched
      });
    }

    res.status(201).json({ message: enriched });
  } catch (err) {
    console.error('Send channel message error:', err);
    res.status(500).json({ error: 'Server error sending message' });
  }
});

// React to a message (Discord / WhatsApp emoji reaction)
router.post('/:id/channels/:channelId/messages/:messageId/react', (req, res) => {
  try {
    const { emoji = '👍' } = req.body;
    const msg = findById('community_messages', req.params.messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const reactions = msg.reactions || {};
    const userList = reactions[emoji] || [];

    let updatedUsers;
    if (userList.includes(req.user.id)) {
      // Toggle off
      updatedUsers = userList.filter(id => id !== req.user.id);
    } else {
      // Toggle on
      updatedUsers = [...userList, req.user.id];
    }

    if (updatedUsers.length > 0) {
      reactions[emoji] = updatedUsers;
    } else {
      delete reactions[emoji];
    }

    update('community_messages', req.params.messageId, { reactions });

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('community_reaction', {
        communityId: req.params.id,
        channelId: req.params.channelId,
        messageId: req.params.messageId,
        reactions
      });
    }

    res.json({ success: true, reactions });
  } catch (err) {
    console.error('Reaction error:', err);
    res.status(500).json({ error: 'Server error processing reaction' });
  }
});

// Pin / Unpin message
router.post('/:id/channels/:channelId/messages/:messageId/pin', (req, res) => {
  try {
    const msg = findById('community_messages', req.params.messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const newPinned = msg.is_pinned ? 0 : 1;
    update('community_messages', req.params.messageId, { is_pinned: newPinned });
    res.json({ success: true, is_pinned: newPinned });
  } catch (err) {
    res.status(500).json({ error: 'Server error pinning message' });
  }
});

// Delete message
router.delete('/:id/channels/:channelId/messages/:messageId', (req, res) => {
  try {
    const msg = findById('community_messages', req.params.messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }
    remove('community_messages', req.params.messageId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting message' });
  }
});

export default router;
