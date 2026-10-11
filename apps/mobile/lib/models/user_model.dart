class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String headline;
  final String bio;
  final String avatarUrl;
  final String role;
  final String verificationStatus;
  final int? batchYear;
  final String? currentCompany;
  final String? currentPosition;
  final String? location;
  final int profileCompleteness;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.headline,
    this.bio = '',
    this.avatarUrl = '',
    this.role = 'student',
    this.verificationStatus = 'unverified',
    this.batchYear,
    this.currentCompany,
    this.currentPosition,
    this.location,
    this.profileCompleteness = 30,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      fullName: json['full_name']?.toString() ?? json['name']?.toString() ?? 'ECE Member',
      headline: json['headline']?.toString() ?? 'ECE Student @ RIT',
      bio: json['bio']?.toString() ?? '',
      avatarUrl: json['avatar_url']?.toString() ?? json['avatar']?.toString() ?? '',
      role: json['role']?.toString() ?? 'student',
      verificationStatus: json['verification_status']?.toString() ?? 'unverified',
      batchYear: json['batch_year'] != null ? int.tryParse(json['batch_year'].toString()) : null,
      currentCompany: json['current_company']?.toString() ?? json['company']?.toString(),
      currentPosition: json['current_position']?.toString() ?? json['position']?.toString(),
      location: json['location']?.toString(),
      profileCompleteness: json['profile_completeness'] != null
          ? int.tryParse(json['profile_completeness'].toString()) ?? 30
          : 30,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'headline': headline,
      'bio': bio,
      'avatar_url': avatarUrl,
      'role': role,
      'verification_status': verificationStatus,
      'batch_year': batchYear,
      'current_company': currentCompany,
      'current_position': currentPosition,
      'location': location,
      'profile_completeness': profileCompleteness,
    };
  }
}
