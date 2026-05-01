import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../models/echo.dart';
import '../services/echo_service.dart';
import 'drop_echo_screen.dart';
import 'echo_detail_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _mapController = MapController();
  Position? _position;
  List<Echo> _echoes = [];
  StreamSubscription? _echoSub;
  bool _loadingLocation = true;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    try {
      final pos = await context.read<EchoService>().getCurrentPosition();
      setState(() {
        _position = pos;
        _loadingLocation = false;
      });
      _mapController.move(LatLng(pos.latitude, pos.longitude), 16);
      _subscribeEchoes(pos);
    } catch (e) {
      setState(() => _loadingLocation = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Location error: $e')),
        );
      }
    }
  }

  void _subscribeEchoes(Position pos) {
    _echoSub?.cancel();
    _echoSub = context
        .read<EchoService>()
        .nearbyEchoes(pos.latitude, pos.longitude)
        .listen((echoes) {
      if (mounted) setState(() => _echoes = echoes);
    });
  }

  void _openEcho(Echo echo) {
    context.read<EchoService>().incrementView(echo.id);
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => EchoDetailScreen(echo: echo)),
    );
  }

  void _dropEcho() {
    if (_position == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => DropEchoScreen(
          lat: _position!.latitude,
          lng: _position!.longitude,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _echoSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final center = _position != null
        ? LatLng(_position!.latitude, _position!.longitude)
        : const LatLng(37.7749, -122.4194);

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: center,
              initialZoom: 16,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.echomap',
              ),
              if (_position != null)
                CircleLayer(
                  circles: [
                    CircleMarker(
                      point: LatLng(_position!.latitude, _position!.longitude),
                      radius: 8,
                      color: Colors.blue,
                      borderColor: Colors.white,
                      borderStrokeWidth: 2,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: _echoes.map((echo) {
                  return Marker(
                    point: LatLng(echo.lat, echo.lng),
                    width: 40,
                    height: 40,
                    child: GestureDetector(
                      onTap: () => _openEcho(echo),
                      child: const Icon(
                        Icons.location_on,
                        color: Colors.deepPurpleAccent,
                        size: 36,
                        shadows: [Shadow(blurRadius: 4, color: Colors.black54)],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          if (_loadingLocation)
            const Center(child: CircularProgressIndicator()),
          Positioned(
            top: 56,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_echoes.length} echo${_echoes.length == 1 ? '' : 's'} nearby',
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 32,
            right: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton(
                  heroTag: 'locate',
                  mini: true,
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black87,
                  onPressed: () {
                    if (_position != null) {
                      _mapController.move(
                        LatLng(_position!.latitude, _position!.longitude),
                        16,
                      );
                    }
                  },
                  child: const Icon(Icons.my_location),
                ),
                const SizedBox(height: 12),
                FloatingActionButton.extended(
                  heroTag: 'drop',
                  onPressed: _dropEcho,
                  backgroundColor: Colors.deepPurpleAccent,
                  icon: const Icon(Icons.add_location_alt),
                  label: const Text('Drop Echo'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
