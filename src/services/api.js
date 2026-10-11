const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('ritece_token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, config);
  } catch (err) {
    throw new Error('Unable to connect to server. Please check your network or try again.');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
    throw new Error(error.error || error.message || 'Something went wrong');
  }

  const result = await response.json();
  if (result && typeof result === 'object' && !('data' in result)) {
    result.data = result;
  }
  return result;
}

// Auth
export const authAPI = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  getMe: () => request('/auth/me'),
  forgotPassword: (data) => request('/auth/forgot-password', { method: 'POST', body: data }),
  resetPassword: (data) => request('/auth/reset-password', { method: 'POST', body: data }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: data }),
};

// Users
export const usersAPI = {
  getUser: (id) => request(`/users/${id}`),
  getById: (id) => request(`/users/${id}`),
  updateProfile: (data) => request('/users/profile', { method: 'PUT', body: data }),
  getUsers: (params = {}) => request(`/users?${new URLSearchParams(params)}`),
  addEducation: (data) => request('/users/education', { method: 'POST', body: data }),
  deleteEducation: (id) => request(`/users/education/${id}`, { method: 'DELETE' }),
  addExperience: (data) => request('/users/experience', { method: 'POST', body: data }),
  deleteExperience: (id) => request(`/users/experience/${id}`, { method: 'DELETE' }),
  updateSkills: (skills) => request('/users/skills', { method: 'POST', body: { skills } }),
  addProject: (data) => request('/users/projects', { method: 'POST', body: data }),
  deleteProject: (id) => request(`/users/projects/${id}`, { method: 'DELETE' }),
  addCertification: (data) => request('/users/certifications', { method: 'POST', body: data }),
  deleteCertification: (id) => request(`/users/certifications/${id}`, { method: 'DELETE' }),
  addAchievement: (data) => request('/users/achievements', { method: 'POST', body: data }),
  deleteAchievement: (id) => request(`/users/achievements/${id}`, { method: 'DELETE' }),
  updateInterests: (interests) => request('/users/interests', { method: 'POST', body: { interests } }),
  updateLanguages: (languages) => request('/users/languages', { method: 'POST', body: { languages } }),
};

// Posts
export const postsAPI = {
  getFeed: (params = {}) => request(`/posts?${new URLSearchParams(params)}`),
  createPost: (data) => request('/posts', { method: 'POST', body: data }),
  updatePost: (id, data) => request(`/posts/${id}`, { method: 'PUT', body: data }),
  editPost: (id, data) => request(`/posts/${id}`, { method: 'PUT', body: data }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  reactToPost: (id, type) => request(`/posts/${id}/react`, { method: 'POST', body: { type } }),
  commentOnPost: (id, content) => request(`/posts/${id}/comments`, { method: 'POST', body: { content } }),
  getComments: (id) => request(`/posts/${id}/comments`),
  deleteComment: (postId, commentId) => request(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
  likeComment: (postId, commentId) => request(`/posts/${postId}/comments/${commentId}/like`, { method: 'POST' }),
  savePost: (id) => request(`/posts/${id}/save`, { method: 'POST' }),
  getSavedPosts: () => request('/posts/saved'),
  sharePost: (id) => request(`/posts/${id}/share`, { method: 'POST' }),
};

// Connections
export const connectionsAPI = {
  sendRequest: (receiver) => {
    const receiver_id = typeof receiver === 'object' && receiver !== null
      ? (receiver.receiver_id || receiver.userId || receiver._id || receiver.id)
      : receiver;
    return request('/connections/request', { method: 'POST', body: { receiver_id } });
  },
  withdrawRequest: (idOrTarget) => {
    const target = typeof idOrTarget === 'object' && idOrTarget !== null
      ? (idOrTarget.id || idOrTarget.connection_id || idOrTarget.receiver_id)
      : idOrTarget;
    return request(`/connections/${target}/withdraw`, { method: 'POST' });
  },
  acceptRequest: (id) => request(`/connections/${id}/accept`, { method: 'PUT' }),
  rejectRequest: (id) => request(`/connections/${id}/reject`, { method: 'PUT' }),
  removeConnection: (id) => request(`/connections/${id}`, { method: 'DELETE' }),
  getPending: () => request('/connections/pending'),
  getRequests: () => request('/connections/pending'),
  getSentRequests: () => request('/connections/sent'),
  getMyConnections: () => request('/connections/my'),
  getConnections: () => request('/connections/my'),
  getSuggestions: () => request('/connections/suggestions'),
  getMentors: (params = {}) => request(`/connections/mentors?${new URLSearchParams(params)}`),
  askSenior: (data) => request('/connections/ask-senior', { method: 'POST', body: data }),
  pledgePassItForward: () => request('/connections/pass-it-forward', { method: 'POST' }),
  follow: (id) => request(`/connections/follow/${id}`, { method: 'POST' }),
};

// Projects / ECE Project Bank
export const projectsAPI = {
  getAll: (params = {}) => request(`/projects?${new URLSearchParams(params)}`),
  getProjects: (params = {}) => request(`/projects?${new URLSearchParams(params)}`),
  create: (data) => request('/projects', { method: 'POST', body: data }),
  star: (id) => request(`/projects/${id}/star`, { method: 'POST' }),
  joinTeam: (id, data = {}) => request(`/projects/${id}/join`, { method: 'POST', body: data }),
};

// Messages
export const messagesAPI = {
  getConversations: () => request('/messages/conversations'),
  createConversation: (user_id) => request('/messages/conversations', { method: 'POST', body: { user_id } }),
  getMessages: (id) => request(`/messages/conversations/${id}/messages`),
  sendMessage: (id, payload) => {
    const body = typeof payload === 'string' ? { content: payload } : payload;
    return request(`/messages/conversations/${id}/messages`, { method: 'POST', body });
  },
  getUnreadCount: () => request('/messages/unread-count'),
};

// Jobs
export const jobsAPI = {
  getAll: (params = {}) => request(`/jobs?${new URLSearchParams(params)}`),
  getJobs: (params = {}) => request(`/jobs?${new URLSearchParams(params)}`),
  getJob: (id) => request(`/jobs/${id}`),
  create: (data) => request('/jobs', { method: 'POST', body: data }),
  createJob: (data) => request('/jobs', { method: 'POST', body: data }),
  apply: (id, data = {}) => request(`/jobs/${id}/apply`, { method: 'POST', body: data }),
  getApplication: (id) => request(`/jobs/${id}/application`),
  saveJob: (id) => request(`/jobs/${id}/save`, { method: 'POST' }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: 'DELETE' }),
};

// Hackathons
export const hackathonsAPI = {
  getAll: (params = {}) => request(`/hackathons?${new URLSearchParams(params)}`),
  getOne: (id) => request(`/hackathons/${id}`),
  create: (data) => request('/hackathons', { method: 'POST', body: data }),
  createHackathon: (data) => request('/hackathons/hackathon', { method: 'POST', body: data }),
  createIncubation: (data) => request('/hackathons/incubation', { method: 'POST', body: data }),
  createWorkshop: (data) => request('/hackathons/workshop', { method: 'POST', body: data }),
  register: (id, data = {}) => request(`/hackathons/${id}/register`, { method: 'POST', body: data }),
  getRegistration: (id) => request(`/hackathons/${id}/registration`),
};

// Communities (Discord & WhatsApp Channels)
export const communitiesAPI = {
  getAll: (params = {}) => request(`/communities?${new URLSearchParams(params)}`),
  getOne: (id) => request(`/communities/${id}`),
  create: (data) => request('/communities', { method: 'POST', body: data }),
  join: (id) => request(`/communities/${id}/join`, { method: 'POST' }),
  leave: (id) => request(`/communities/${id}/leave`, { method: 'POST' }),
  getChannels: (id) => request(`/communities/${id}/channels`),
  createChannel: (id, data) => request(`/communities/${id}/channels`, { method: 'POST', body: data }),
  getMessages: (id, channelId) => request(`/communities/${id}/channels/${channelId}/messages`),
  sendMessage: (id, channelId, data) => request(`/communities/${id}/channels/${channelId}/messages`, { method: 'POST', body: data }),
  reactMessage: (id, channelId, messageId, emoji) => request(`/communities/${id}/channels/${channelId}/messages/${messageId}/react`, { method: 'POST', body: { emoji } }),
  pinMessage: (id, channelId, messageId) => request(`/communities/${id}/channels/${channelId}/messages/${messageId}/pin`, { method: 'POST' }),
  deleteMessage: (id, channelId, messageId) => request(`/communities/${id}/channels/${channelId}/messages/${messageId}`, { method: 'DELETE' }),
  getPosts: (id) => request(`/communities/${id}/posts`),
  createPost: (id, data) => request(`/communities/${id}/posts`, { method: 'POST', body: data }),
};

// Events
export const eventsAPI = {
  getAll: (params = {}) => request(`/events?${new URLSearchParams(params)}`),
  getOne: (id) => request(`/events/${id}`),
  create: (data) => request('/events', { method: 'POST', body: data }),
  register: (id) => request(`/events/${id}/register`, { method: 'POST' }),
};

// Notifications
export const notificationsAPI = {
  getAll: (params = {}) => request(`/notifications?${new URLSearchParams(params)}`),
  getUnreadCount: () => request('/notifications/unread-count'),
  getBadgeCounts: () => request('/notifications/badge-counts'),
  markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => request('/notifications/read-all', { method: 'PUT' }),
};

// Admin
export const adminAPI = {
  getAnalytics: () => request('/admin/analytics'),
  getStats: () => request('/admin/analytics'),
  getUsers: (params = {}) => request(`/admin/users?${new URLSearchParams(params)}`),
  verifyUser: (id, status = 'verified') => request(`/admin/users/${id}/verify`, { method: 'PUT', body: { status } }),
  suspendUser: (id) => request(`/admin/users/${id}/suspend`, { method: 'PUT' }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  getReports: () => request('/admin/reports'),
  handleReport: (id, data) => request(`/admin/reports/${id}`, { method: 'PUT', body: data }),
  createAnnouncement: (data) => request('/admin/announcements', { method: 'POST', body: data }),
  getAnnouncements: () => request('/admin/announcements'),
  deleteAnnouncement: (id) => request(`/admin/announcements/${id}`, { method: 'DELETE' }),
  pinPost: (id) => request(`/admin/posts/${id}/pin`, { method: 'PUT' }),
  approveCommunity: (id) => request(`/admin/communities/${id}/approve`, { method: 'PUT' }),
  getPendingCommunities: () => request('/admin/communities/pending'),
  previewAcademicRollover: () => request('/admin/academic-rollover/preview'),
  executeAcademicRollover: () => request('/admin/academic-rollover', { method: 'POST', body: { dryRun: false } }),
  getEvents: (params = {}) => request(`/events?${new URLSearchParams(params)}`),
  createEvent: (data) => request('/events', { method: 'POST', body: data }),
  rsvpEvent: (id) => request(`/events/${id}/register`, { method: 'POST' }),
};

// Search
export const searchAPI = {
  search: (q, category = 'all') => request(`/search?q=${encodeURIComponent(q)}&category=${category}`),
  globalSearch: (q) => request(`/search?q=${encodeURIComponent(q)}`),
};
