import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';
import '../models/echo.dart';

class EchoService {
  final _firestore = FirebaseFirestore.instance;
  static const double nearbyRadiusMeters = 150;

  Future<Position> getCurrentPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) throw Exception('Location services disabled');

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permission denied');
      }
    }
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
  }

  Future<Echo> dropEcho({
    required String creatorId,
    required String creatorName,
    String? creatorPhotoUrl,
    String? text,
    required double lat,
    required double lng,
  }) async {
    final doc = _firestore.collection('echoes').doc();
    final echo = Echo(
      id: doc.id,
      creatorId: creatorId,
      creatorName: creatorName,
      creatorPhotoUrl: creatorPhotoUrl,
      text: text,
      lat: lat,
      lng: lng,
      createdAt: DateTime.now(),
    );
    await doc.set(echo.toMap());
    return echo;
  }

  Stream<List<Echo>> nearbyEchoes(double lat, double lng) {
    const delta = 0.0014;
    return _firestore
        .collection('echoes')
        .where('lat', isGreaterThan: lat - delta)
        .where('lat', isLessThan: lat + delta)
        .snapshots()
        .map((snap) => snap.docs
            .map(Echo.fromDoc)
            .where((e) =>
                Geolocator.distanceBetween(lat, lng, e.lat, e.lng) <=
                nearbyRadiusMeters)
            .toList());
  }

  Future<void> incrementView(String echoId) async {
    await _firestore
        .collection('echoes')
        .doc(echoId)
        .update({'viewCount': FieldValue.increment(1)});
  }

  Stream<List<Echo>> myEchoes(String uid) {
    return _firestore
        .collection('echoes')
        .where('creatorId', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map(Echo.fromDoc).toList());
  }
}
