import 'package:cloud_firestore/cloud_firestore.dart';

class Echo {
  final String id;
  final String creatorId;
  final String creatorName;
  final String? creatorPhotoUrl;
  final String? text;
  // imageUrl reserved for future use when Storage is enabled
  final String? imageUrl;
  final double lat;
  final double lng;
  final DateTime createdAt;
  final int viewCount;

  Echo({
    required this.id,
    required this.creatorId,
    required this.creatorName,
    this.creatorPhotoUrl,
    this.text,
    this.imageUrl,
    required this.lat,
    required this.lng,
    required this.createdAt,
    this.viewCount = 0,
  });

  factory Echo.fromDoc(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return Echo(
      id: doc.id,
      creatorId: d['creatorId'] ?? '',
      creatorName: d['creatorName'] ?? 'Anonymous',
      creatorPhotoUrl: d['creatorPhotoUrl'],
      text: d['text'],
      imageUrl: d['imageUrl'],
      lat: (d['lat'] as num).toDouble(),
      lng: (d['lng'] as num).toDouble(),
      createdAt: (d['createdAt'] as Timestamp).toDate(),
      viewCount: d['viewCount'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'creatorId': creatorId,
        'creatorName': creatorName,
        'creatorPhotoUrl': creatorPhotoUrl,
        'text': text,
        'imageUrl': imageUrl,
        'lat': lat,
        'lng': lng,
        'createdAt': Timestamp.fromDate(createdAt),
        'viewCount': viewCount,
      };
}
