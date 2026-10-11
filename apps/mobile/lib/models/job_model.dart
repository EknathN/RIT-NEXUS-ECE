class JobModel {
  final String id;
  final String title;
  final String company;
  final String location;
  final bool isRemote;
  final String jobType;
  final String domain;
  final String description;
  final List<String> skills;
  final bool isAlumniReferral;
  final String? applicationUrl;
  final DateTime createdAt;

  JobModel({
    required this.id,
    required this.title,
    required this.company,
    required this.location,
    this.isRemote = false,
    this.jobType = 'full_time',
    this.domain = 'VLSI / Semiconductor',
    required this.description,
    required this.skills,
    this.isAlumniReferral = false,
    this.applicationUrl,
    required this.createdAt,
  });

  factory JobModel.fromJson(Map<String, dynamic> json) {
    List<String> parsedSkills = [];
    if (json['skills_required'] is List) {
      parsedSkills = (json['skills_required'] as List).map((e) => e.toString()).toList();
    } else if (json['skills'] is List) {
      parsedSkills = (json['skills'] as List).map((e) => e.toString()).toList();
    }

    return JobModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'ECE Role',
      company: json['company']?.toString() ?? 'Top Core Tech',
      location: json['location']?.toString() ?? 'Chennai / Bengaluru',
      isRemote: json['is_remote'] == true,
      jobType: json['job_type']?.toString() ?? json['type']?.toString() ?? 'full_time',
      domain: json['domain']?.toString() ?? 'VLSI / Semiconductor',
      description: json['description']?.toString() ?? '',
      skills: parsedSkills,
      isAlumniReferral: json['is_alumni_referral'] == true,
      applicationUrl: json['application_url']?.toString(),
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now() : DateTime.now(),
    );
  }
}
