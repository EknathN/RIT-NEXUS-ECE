import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class NetworkScreen extends StatefulWidget {
  const NetworkScreen({super.key});

  @override
  State<NetworkScreen> createState() => _NetworkScreenState();
}

class _NetworkScreenState extends State<NetworkScreen> {
  List<UserModel> _users = [];
  bool _isLoading = true;
  String _selectedFilter = 'All';
  final Set<String> _pendingConnections = {};

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    final users = await ApiService().getNetworkUsers();
    if (mounted) {
      setState(() {
        _users = users;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredUsers = _users.where((u) {
      if (_selectedFilter == 'All') return true;
      if (_selectedFilter == 'Alumni') return u.role.toLowerCase() == 'alumni';
      if (_selectedFilter == 'Students') return u.role.toLowerCase() == 'student';
      if (_selectedFilter == 'Faculty') return u.role.toLowerCase() == 'faculty';
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('ECE Network & Alumni'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: AppTheme.textMuted), onPressed: _loadUsers),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: ['All', 'Alumni', 'Students', 'Faculty'].map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(filter),
                    selected: isSelected,
                    selectedColor: AppTheme.accentCyan,
                    labelStyle: TextStyle(
                      color: isSelected ? AppTheme.primaryDark : AppTheme.textLight,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                    backgroundColor: AppTheme.secondaryDark,
                    onSelected: (val) {
                      setState(() => _selectedFilter = filter);
                    },
                  ),
                );
              }).toList(),
            ),
          ),

          // User Grid/List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.accentCyan))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    itemCount: filteredUsers.length,
                    itemBuilder: (context, index) {
                      final user = filteredUsers[index];
                      final isPending = _pendingConnections.contains(user.id);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppTheme.cardBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.borderDark),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: AppTheme.secondaryDark,
                              child: Text(
                                user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'E',
                                style: const TextStyle(
                                  color: AppTheme.accentCyan,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        user.fullName,
                                        style: const TextStyle(
                                          color: AppTheme.textLight,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                      if (user.verificationStatus == 'verified') ...[
                                        const SizedBox(width: 4),
                                        const Icon(Icons.verified, size: 14, color: AppTheme.accentCyan),
                                      ],
                                    ],
                                  ),
                                  Text(
                                    user.headline,
                                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  if (user.batchYear != null)
                                    Text(
                                      'Batch of ${user.batchYear}',
                                      style: TextStyle(
                                        color: AppTheme.accentCyan.withOpacity(0.8),
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isPending ? AppTheme.secondaryDark : AppTheme.accentCyan,
                                foregroundColor: isPending ? AppTheme.textMuted : AppTheme.primaryDark,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              onPressed: isPending
                                  ? null
                                  : () async {
                                      await ApiService().sendConnectionRequest(user.id);
                                      setState(() {
                                        _pendingConnections.add(user.id);
                                      });
                                    },
                              child: Text(
                                isPending ? 'Pending' : 'Connect',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
