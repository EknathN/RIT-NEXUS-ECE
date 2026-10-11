import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/main_navigation_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService().init();
  runApp(const RitEceApp());
}

class RitEceApp extends StatelessWidget {
  const RitEceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RIT ECE',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: ApiService().isAuthenticated
          ? const MainNavigationScreen()
          : const LoginScreen(),
    );
  }
}
