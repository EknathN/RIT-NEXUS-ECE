import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_model.dart';
import '../models/post_model.dart';
import '../models/job_model.dart';
import '../models/message_model.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  // Android emulator loopback is 10.0.2.2; standard is localhost:5000
  String baseUrl = 'http://10.0.2.2:5000/api';
  String? _token;
  UserModel? _currentUser;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _token != null && _currentUser != null;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    final userJson = prefs.getString('auth_user');
    if (userJson != null) {
      try {
        _currentUser = UserModel.fromJson(jsonDecode(userJson));
      } catch (_) {}
    }
  }

  Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  static const String approvedDomain = 'ece.ritchennai.edu.in';
  static const String supabaseUrl = 'https://cbburujwqsiftywbagwl.supabase.co';
  static const String supabaseAnonKey = 'sb_publishable_GYhcFKUZnUWjNPJCsBsPZw_JYwnMzyg';

  static String normalizeEmail(String email) {
    return email.trim().toLowerCase();
  }

  static bool isValidCollegeEmail(String email) {
    final normalized = normalizeEmail(email);
    final parts = normalized.split('@');
    if (parts.length != 2) return false;
    final local = parts[0];
    final domain = parts[1];
    if (local.isEmpty) return false;
    return domain == approvedDomain;
  }

  // --- AUTHENTICATION ---
  Future<UserModel> login(String email, String password) async {
    final normalized = normalizeEmail(email);

    // Strict domain check
    if (!isValidCollegeEmail(normalized)) {
      throw Exception(
        'Access denied: Only official college email addresses ending with @$approvedDomain are permitted.',
      );
    }

    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': normalized, 'password': password}),
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = jsonDecode(res.body);
        _token = data['token'];
        _currentUser = UserModel.fromJson(data['user']);

        final prefs = await SharedPreferences.getInstance();
        if (_token != null) await prefs.setString('auth_token', _token!);
        await prefs.setString('auth_user', jsonEncode(_currentUser!.toJson()));

        return _currentUser!;
      } else {
        final err = jsonDecode(res.body);
        throw Exception(err['error'] ?? 'Authentication failed');
      }
    } catch (e) {
      // If error was already domain failure, propagate
      if (e.toString().contains('Access denied')) {
        rethrow;
      }

      // Check Supabase directly if backend REST is not reachable
      try {
        final sb = Supabase.instance.client;
        final authRes = await sb.auth.signInWithPassword(
          email: normalized,
          password: password,
        );
        if (authRes.user != null) {
          if (authRes.user!.emailConfirmedAt == null) {
            await sb.auth.signOut();
            throw Exception('Please confirm your @$approvedDomain email before accessing the platform.');
          }
          _token = authRes.session?.accessToken;
          _currentUser = UserModel(
            id: authRes.user!.id,
            email: normalized,
            fullName: authRes.user!.userMetadata?['full_name'] ?? normalized.split('@')[0],
            headline: 'ECE Professional @ RIT Chennai',
            role: authRes.user!.userMetadata?['role'] ?? 'student',
            verificationStatus: 'verified',
          );
          return _currentUser!;
        }
      } catch (sbE) {
        if (sbE.toString().contains('confirm your')) rethrow;
      }

      rethrow;
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String fullName,
    String accountType = 'student',
  }) async {
    final normalized = normalizeEmail(email);

    if (!isValidCollegeEmail(normalized)) {
      throw Exception(
        'Registration denied: Only official college email addresses ending with @$approvedDomain are permitted.',
      );
    }

    // Try Supabase Auth
    try {
      final sb = Supabase.instance.client;
      await sb.auth.signUp(
        email: normalized,
        password: password,
        data: {'full_name': fullName, 'role': accountType},
      );
    } catch (_) {}

    // Register with backend REST
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': normalized,
        'password': password,
        'full_name': fullName,
        'account_type': accountType,
      }),
    );

    if (res.statusCode >= 200 && res.statusCode < 300) {
      final data = jsonDecode(res.body);
      _token = data['token'];
      _currentUser = UserModel.fromJson(data['user']);
      final prefs = await SharedPreferences.getInstance();
      if (_token != null) await prefs.setString('auth_token', _token!);
      await prefs.setString('auth_user', jsonEncode(_currentUser!.toJson()));
    } else {
      final err = jsonDecode(res.body);
      throw Exception(err['error'] ?? 'Registration failed');
    }
  }

  Future<void> logout() async {
    _token = null;
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
  }

  // --- POSTS & FEED ---
  Future<List<PostModel>> getPosts() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/posts'), headers: _headers());
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['posts'] as List? ?? []);
        return list.map((item) => PostModel.fromJson(item)).toList();
      }
    } catch (_) {}

    // Fallback sample posts if backend network is unreachable
    return [
      PostModel(
        id: '1',
        authorId: 'alumni_1',
        authorName: 'Priya Krishnan',
        authorHeadline: 'Senior Silicon Design Engineer @ Intel',
        authorAvatar: '',
        authorRole: 'alumni',
        content:
            'Excited to announce that Intel Bangalore is hiring for ASIC verification! Multiple RIT ECE graduates are thriving here. Connect for referrals.',
        tags: ['#VLSI', '#Intel', '#RITECE', '#AlumniReferral'],
        likesCount: 18,
        commentsCount: 4,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      PostModel(
        id: '2',
        authorId: 'student_1',
        authorName: 'Kavitha Sundaram',
        authorHeadline: 'Final Year ECE @ RIT | VLSI & Embedded',
        authorAvatar: '',
        authorRole: 'student',
        content:
            'Synthesized a 5-stage pipelined 32-bit RISC-V core on our Xilinx Artix-7 FPGA in the RIT ECE Advanced Lab!',
        tags: ['#RISCV', '#FPGA', '#SystemVerilog'],
        likesCount: 12,
        commentsCount: 2,
        createdAt: DateTime.now().subtract(const Duration(hours: 5)),
      ),
    ];
  }

  Future<PostModel> createPost(String content, List<String> tags, {String? mediaUrl}) async {
    final payload = <String, dynamic>{
      'content': content,
      'tags': tags,
      if (mediaUrl != null) 'media_url': mediaUrl,
    };

    final res = await http.post(
      Uri.parse('$baseUrl/posts'),
      headers: _headers(),
      body: jsonEncode(payload),
    );

    if (res.statusCode >= 200 && res.statusCode < 300) {
      final data = jsonDecode(res.body);
      return PostModel.fromJson(data['post'] ?? data);
    } else {
      // Local fallback
      return PostModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        authorId: _currentUser?.id ?? 'me',
        authorName: _currentUser?.fullName ?? 'You',
        authorHeadline: _currentUser?.headline ?? 'ECE Member',
        authorAvatar: _currentUser?.avatarUrl ?? '',
        authorRole: _currentUser?.role ?? 'student',
        content: content,
        tags: tags,
        likesCount: 0,
        commentsCount: 0,
        mediaUrl: mediaUrl,
        createdAt: DateTime.now(),
      );
    }
  }

  Future<bool> likePost(String postId) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/posts/$postId/react'),
        headers: _headers(),
        body: jsonEncode({'type': 'like'}),
      );
      return res.statusCode == 200;
    } catch (_) {
      return true;
    }
  }

  // --- NETWORK / USERS ---
  Future<List<UserModel>> getNetworkUsers() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/users'), headers: _headers());
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['users'] as List? ?? []);
        return list.map((item) => UserModel.fromJson(item)).toList();
      }
    } catch (_) {}

    return [
      UserModel(
        id: '2',
        email: 'priya.k@ritchennai.edu.in',
        fullName: 'Priya Krishnan',
        headline: 'Senior Silicon Design Engineer @ Intel',
        role: 'alumni',
        batchYear: 2019,
        currentCompany: 'Intel Corporation',
      ),
      UserModel(
        id: '3',
        email: 'kavitha.s@ritchennai.edu.in',
        fullName: 'Kavitha Sundaram',
        headline: 'Final Year ECE Student @ RIT',
        role: 'student',
        batchYear: 2025,
      ),
      UserModel(
        id: '4',
        email: 'rahul.m@ritchennai.edu.in',
        fullName: 'Rahul Manikandan',
        headline: '3rd Year ECE | Robotics Lead',
        role: 'student',
        batchYear: 2026,
      ),
    ];
  }

  Future<bool> sendConnectionRequest(String userId) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/connections/request'),
        headers: _headers(),
        body: jsonEncode({'recipient_id': userId}),
      );
      return res.statusCode == 200;
    } catch (_) {
      return true;
    }
  }

  // --- JOBS & OPPORTUNITIES ---
  Future<List<JobModel>> getJobs() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/jobs'), headers: _headers());
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['jobs'] as List? ?? []);
        return list.map((item) => JobModel.fromJson(item)).toList();
      }
    } catch (_) {}

    return [
      JobModel(
        id: '1',
        title: 'Associate ASIC Verification Engineer',
        company: 'Intel Corporation',
        location: 'Bengaluru, Karnataka',
        isRemote: false,
        jobType: 'full_time',
        domain: 'VLSI / Semiconductor',
        description:
            'Seeking 2024/2025 ECE graduates with strong knowledge of SystemVerilog, UVM, and digital design fundamentals.',
        skills: ['SystemVerilog', 'UVM', 'Verilog', 'Perl/Python'],
        isAlumniReferral: true,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
      JobModel(
        id: '2',
        title: 'Embedded Firmware Engineering Intern',
        company: 'Bosch Global Software',
        location: 'Coimbatore, Tamil Nadu',
        isRemote: false,
        jobType: 'internship',
        domain: 'Embedded Systems',
        description: '6-month internship on Automotive CAN/LIN bus protocols and FreeRTOS microcontroller development.',
        skills: ['Embedded C', 'FreeRTOS', 'CAN', 'STM32'],
        isAlumniReferral: false,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ];
  }

  // --- MESSAGES ---
  Future<List<ConversationModel>> getConversations() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/messages/conversations'), headers: _headers());
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['conversations'] as List? ?? []);
        return list.map((item) => ConversationModel.fromJson(item, _currentUser?.id ?? '')).toList();
      }
    } catch (_) {}

    return [
      ConversationModel(
        id: 'c1',
        title: 'Priya Krishnan',
        otherUserName: 'Priya Krishnan',
        otherUserAvatar: '',
        otherUserHeadline: 'Senior Silicon Engineer @ Intel',
        lastMessage: 'Sure, send your resume across for the referral!',
        unreadCount: 1,
        updatedAt: DateTime.now().subtract(const Duration(minutes: 15)),
      ),
    ];
  }

  Future<List<MessageModel>> getMessages(String conversationId) async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/messages/$conversationId'), headers: _headers());
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['messages'] as List? ?? []);
        return list.map((item) => MessageModel.fromJson(item)).toList();
      }
    } catch (_) {}

    return [
      MessageModel(
        id: 'm1',
        conversationId: conversationId,
        senderId: 'alumni_1',
        senderName: 'Priya Krishnan',
        content: 'Hi! Saw your RISC-V project post. Truly impressive work!',
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      MessageModel(
        id: 'm2',
        conversationId: conversationId,
        senderId: _currentUser?.id ?? 'me',
        senderName: 'You',
        content: 'Thank you Priya ma\'am! Would love to apply for the Intel ASIC role.',
        createdAt: DateTime.now().subtract(const Duration(minutes: 40)),
      ),
    ];
  }

  Future<MessageModel> sendMessage(String conversationId, String content) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/messages/$conversationId'),
        headers: _headers(),
        body: jsonEncode({'content': content}),
      );
      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = jsonDecode(res.body);
        return MessageModel.fromJson(data['message'] ?? data);
      }
    } catch (_) {}

    return MessageModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      conversationId: conversationId,
      senderId: _currentUser?.id ?? 'me',
      senderName: 'You',
      content: content,
      createdAt: DateTime.now(),
    );
  }

  // --- PROFILE UPDATE ---
  Future<UserModel> updateProfile(Map<String, dynamic> updates) async {
    final res = await http.put(
      Uri.parse('$baseUrl/users/profile'),
      headers: _headers(),
      body: jsonEncode(updates),
    );

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      _currentUser = UserModel.fromJson(data['user'] ?? data);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_user', jsonEncode(_currentUser!.toJson()));
      return _currentUser!;
    } else {
      // Local apply
      _currentUser = UserModel(
        id: _currentUser?.id ?? 'me',
        email: _currentUser?.email ?? '',
        fullName: updates['full_name'] ?? _currentUser?.fullName ?? 'ECE Member',
        headline: updates['headline'] ?? _currentUser?.headline ?? '',
        bio: updates['bio'] ?? _currentUser?.bio ?? '',
        role: _currentUser?.role ?? 'student',
      );
      return _currentUser!;
    }
  }
}
