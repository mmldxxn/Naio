class AppUser {
  final String uid;
  final String displayName;
  final String? photoUrl;
  final String? email;

  AppUser({
    required this.uid,
    required this.displayName,
    this.photoUrl,
    this.email,
  });

  factory AppUser.fromMap(String uid, Map<String, dynamic> d) => AppUser(
        uid: uid,
        displayName: d['displayName'] ?? 'Anonymous',
        photoUrl: d['photoUrl'],
        email: d['email'],
      );

  Map<String, dynamic> toMap() => {
        'displayName': displayName,
        'photoUrl': photoUrl,
        'email': email,
      };
}
