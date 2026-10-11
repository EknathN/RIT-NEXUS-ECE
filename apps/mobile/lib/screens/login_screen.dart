import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import 'main_navigation_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'kavitha.s@ece.ritchennai.edu.in');
  final _passwordController = TextEditingController(text: 'password123');
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleLogin([String? email, String? password]) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final loginEmail = email ?? _emailController.text.trim();
      final loginPass = password ?? _passwordController.text;

      await ApiService().login(loginEmail, loginPass);

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // RIT ECE Logo and Branding
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [AppTheme.accentCyan, AppTheme.accentBlue],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.accentCyan.withOpacity(0.3),
                          blurRadius: 20,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(Icons.memory, size: 48, color: AppTheme.primaryDark),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'RIT ECE',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                    color: AppTheme.textLight,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Professional Networking & Opportunity Portal\nRajalakshmi Institute of Technology, Chennai',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4),
                ),
                const SizedBox(height: 36),

                if (_errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.15),
                      border: Border.all(color: Colors.redAccent.withOpacity(0.5)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                  ),

                // Email field
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: AppTheme.textLight),
                  decoration: const InputDecoration(
                    labelText: 'College Email (@ece.ritchennai.edu.in)',
                    hintText: 'student@ece.ritchennai.edu.in',
                    prefixIcon: Icon(Icons.email_outlined, color: AppTheme.accentCyan),
                  ),
                ),
                const SizedBox(height: 16),

                // Password field
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  style: const TextStyle(color: AppTheme.textLight),
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(Icons.lock_outline, color: AppTheme.accentCyan),
                  ),
                ),
                const SizedBox(height: 24),

                // Login Button
                ElevatedButton(
                  onPressed: _isLoading ? null : () => _handleLogin(),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryDark),
                        )
                      : const Text('Sign In to Network'),
                ),
                const SizedBox(height: 32),

                // Quick Demo Logins Section
                const Divider(color: AppTheme.borderDark),
                const SizedBox(height: 12),
                const Text(
                  'APPROVED DOMAIN ACCESS (@ece.ritchennai.edu.in)',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.0,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.accentCyan,
                  ),
                ),
                const SizedBox(height: 12),

                _demoButton(
                  title: 'Final Year Student (Kavitha)',
                  subtitle: 'VLSI & Embedded Systems Specialist',
                  icon: Icons.school,
                  email: 'kavitha.s@ece.ritchennai.edu.in',
                ),
                const SizedBox(height: 8),
                _demoButton(
                  title: 'Alumni (Priya Krishnan)',
                  subtitle: 'Sr. Silicon Design Engineer @ Intel',
                  icon: Icons.work,
                  email: 'priya.k@ece.ritchennai.edu.in',
                ),
                const SizedBox(height: 8),
                _demoButton(
                  title: 'Department Admin / HOD',
                  subtitle: 'ECE Command Center & Moderation',
                  icon: Icons.admin_panel_settings,
                  email: 'admin@ece.ritchennai.edu.in',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _demoButton({
    required String title,
    required String subtitle,
    required IconData icon,
    required String email,
  }) {
    return InkWell(
      onTap: () {
        _emailController.text = email;
        _passwordController.text = 'password123';
        _handleLogin(email, 'password123');
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.secondaryDark,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppTheme.borderDark),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.accentCyan, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: AppTheme.textLight, fontSize: 13, fontWeight: FontWeight.bold)),
                  Text(subtitle, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textMuted),
          ],
        ),
      ),
    );
  }
}
