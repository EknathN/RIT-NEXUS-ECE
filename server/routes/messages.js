import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findOne, findWhere, insert, update, remove, updateWhere } from '../db/schema.js';

const router = express.Router();

// Helper to enrich partner user
function formatPartner(user) {
  if (!user) return null;
  return {
    id: user.id,
    _id: user.id,
    full_name: user.full_name,
    fullName: user.full_name,
    avatar: user.profile_photo,
    profile_photo: user.profile_photo,
    headline: user.headline,
    role: user.role || user.account_type || 'student',
    verification_status: user.verification_status,
  };
}

// Get conversations
router.get('/conversations', (req, res) => {
  try {
    const rawList = findWhere('conversations', c =>
      c.participant1_id === req.user.id || c.participant2_id === req.user.id
    )
    .sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at))
    .map(conv => {
      const otherId = conv.participant1_id === req.user.id ? conv.participant2_id : conv.participant1_id;
      const other = findById('users', otherId);
      const partner = formatPartner(other);
      const unreadCount = findWhere('messages', m =>
        m.conversation_id === conv.id && m.sender_id !== req.user.id && !m.is_read
      ).length;
      
      return {
        ...conv,
        _id: conv.id,
        other: partner,
        partner,
        unreadCount,
        lastMessage: conv.last_message ? {
          content: conv.last_message,
          createdAt: conv.last_message_at || conv.created_at
        } : null,
      };
    });

    res.json({ conversations: rawList, list: rawList });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get or create conversation
router.post('/conversations', (req, res) => {
  try {
    const { user_id } = req.body;
    
    let conversation = findOne('conversations', { participant1_id: req.user.id, participant2_id: user_id }) ||
                       findOne('conversations', { participant1_id: user_id, participant2_id: req.user.id });
    
    if (!conversation) {
      conversation = {
        id: uuidv4(),
        participant1_id: req.user.id,
        participant2_id: user_id,
        last_message: '',
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      insert('conversations', conversation);
    }
    
    const other = findById('users', user_id);
    const partner = formatPartner(other);
    res.json({
      ...conversation,
      _id: conversation.id,
      other: partner,
      partner,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages in conversation (supports conversation ID or partner user ID)
router.get('/conversations/:id/messages', (req, res) => {
  try {
    let conversation = findById('conversations', req.params.id);
    if (!conversation) {
      conversation = findOne('conversations', { participant1_id: req.user.id, participant2_id: req.params.id }) ||
                     findOne('conversations', { participant1_id: req.params.id, participant2_id: req.user.id });
    }
    
    if (!conversation) {
      return res.json({ messages: [] });
    }
    
    const messages = findAll('messages', { conversation_id: conversation.id })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(m => ({
        ...m,
        _id: m.id,
        sender: { _id: m.sender_id, id: m.sender_id },
        createdAt: m.created_at
      }));
    
    // Mark messages as read
    updateWhere('messages',
      { conversation_id: conversation.id },
      { is_read: 1 }
    );
    
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send message (supports conversation ID or partner user ID)
router.post('/conversations/:id/messages', (req, res) => {
  try {
    const { content, media } = req.body;
    let conversation = findById('conversations', req.params.id);
    if (!conversation) {
      conversation = findOne('conversations', { participant1_id: req.user.id, participant2_id: req.params.id }) ||
                     findOne('conversations', { participant1_id: req.params.id, participant2_id: req.user.id });
      if (!conversation) {
        conversation = {
          id: uuidv4(),
          participant1_id: req.user.id,
          participant2_id: req.params.id,
          last_message: content || '',
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        insert('conversations', conversation);
      }
    }
    
    const message = {
      id: uuidv4(),
      conversation_id: conversation.id,
      sender_id: req.user.id,
      content: content || '',
      media: media || '',
      is_read: 0,
      created_at: new Date().toISOString(),
    };
    insert('messages', message);
    
    // Update conversation
    update('conversations', conversation.id, {
      last_message: content || 'Media',
      last_message_at: new Date().toISOString(),
    });
    
    // Create notification
    const recipientId = conversation.participant1_id === req.user.id
      ? conversation.participant2_id : conversation.participant1_id;
    const sender = findById('users', req.user.id);
    insert('notifications', {
      id: uuidv4(),
      user_id: recipientId,
      from_user_id: req.user.id,
      type: 'message',
      title: 'New Message',
      message: `${sender?.full_name || 'Someone'}: ${content || 'Sent a file'}`,
      link: `/messages/${conversation.id}`,
      is_read: 0,
      created_at: new Date().toISOString(),
    });
    
    const enriched = {
      ...message,
      _id: message.id,
      sender: { _id: req.user.id, id: req.user.id },
      createdAt: message.created_at
    };

    res.status(201).json({ message: enriched, ...enriched });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread message count
router.get('/unread-count', (req, res) => {
  try {
    const myConversations = findWhere('conversations', c =>
      c.participant1_id === req.user.id || c.participant2_id === req.user.id
    );
    let unread = 0;
    myConversations.forEach(conv => {
      unread += findWhere('messages', m =>
        m.conversation_id === conv.id && m.sender_id !== req.user.id && !m.is_read
      ).length;
    });
    res.json({ count: unread });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
