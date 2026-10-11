import 'package:flutter/material.dart';
import '../models/job_model.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class OpportunitiesScreen extends StatefulWidget {
  const OpportunitiesScreen({super.key});

  @override
  State<OpportunitiesScreen> createState() => _OpportunitiesScreenState();
}

class _OpportunitiesScreenState extends State<OpportunitiesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<JobModel> _jobs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadOpportunities();
  }

  Future<void> _loadOpportunities() async {
    setState(() => _isLoading = true);
    final jobs = await ApiService().getJobs();
    if (mounted) {
      setState(() {
        _jobs = jobs;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ECE Opportunities'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.accentCyan,
          labelColor: AppTheme.accentCyan,
          unselectedLabelColor: AppTheme.textMuted,
          tabs: const [
            Tab(text: 'Jobs & Internships'),
            Tab(text: 'Hackathons & Incubation'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Jobs
          _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.accentCyan))
              : ListView.builder(
                  padding: const EdgeInsets.all(14),
                  itemCount: _jobs.length,
                  itemBuilder: (context, index) {
                    final job = _jobs[index];
                    return _JobCard(job: job);
                  },
                ),

          // Tab 2: Hackathons
          ListView(
            padding: const EdgeInsets.all(14),
            children: [
              _hackathonCard(
                title: 'RIT InnoVate Hardware Hackathon 2026',
                organizer: 'RIT ECE Department & IEEE Branch',
                prize: '₹1,50,000 Cash + MSME Incubation',
                dates: 'Nov 12 - 14, 2026',
                theme: 'Smart Hardware & Edge AI',
              ),
              const SizedBox(height: 12),
              _hackathonCard(
                title: 'Smart India Hackathon (Hardware Edition)',
                organizer: 'Ministry of Education & AICTE',
                prize: '₹1,00,000 per problem statement',
                dates: 'Dec 05 - 08, 2026',
                theme: 'Defense Avionics & IoT Telemetry',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _hackathonCard({
    required String title,
    required String organizer,
    required String prize,
    required String dates,
    required String theme,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.accentPurple.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.emoji_events, color: Color(0xFFA855F7), size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.bold, fontSize: 14)),
                    Text(organizer, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('Theme: $theme', style: const TextStyle(color: AppTheme.textLight, fontSize: 13)),
          const SizedBox(height: 4),
          Text('Prize Pool: $prize', style: const TextStyle(color: AppTheme.accentCyan, fontWeight: FontWeight.bold, fontSize: 12.5)),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Registration portal opened!')),
              );
            },
            child: const Text('View Hackathon Details'),
          ),
        ],
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  final JobModel job;
  const _JobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppTheme.secondaryDark,
                child: const Icon(Icons.business, color: AppTheme.accentCyan, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job.title,
                      style: const TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Text(
                      '${job.company} • ${job.location}',
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (job.isAlumniReferral)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF7928CA).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFA855F7).withOpacity(0.4)),
                  ),
                  child: const Text(
                    'Alumni Referral',
                    style: TextStyle(color: Color(0xFFA855F7), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(job.description, style: const TextStyle(color: AppTheme.textLight, fontSize: 13, height: 1.4)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: job.skills.map((s) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.secondaryDark,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: AppTheme.borderDark),
                ),
                child: Text(s, style: const TextStyle(color: AppTheme.accentCyan, fontSize: 11)),
              );
            }).toList(),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Application submitted for ${job.title}!')),
              );
            },
            child: const Text('Apply with RIT ECE Profile'),
          ),
        ],
      ),
    );
  }
}
