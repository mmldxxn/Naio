import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/echo_service.dart';

class DropEchoScreen extends StatefulWidget {
  final double lat;
  final double lng;

  const DropEchoScreen({super.key, required this.lat, required this.lng});

  @override
  State<DropEchoScreen> createState() => _DropEchoScreenState();
}

class _DropEchoScreenState extends State<DropEchoScreen> {
  final _textController = TextEditingController();
  bool _saving = false;

  Future<void> _save() async {
    final text = _textController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Write something first')),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final user = FirebaseAuth.instance.currentUser!;
      await context.read<EchoService>().dropEcho(
            creatorId: user.uid,
            creatorName: user.displayName ?? 'Explorer',
            creatorPhotoUrl: user.photoURL,
            text: text,
            lat: widget.lat,
            lng: widget.lng,
          );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Echo dropped! 📍')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Drop an Echo'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.deepPurpleAccent),
                  )
                : const Text('Post',
                    style: TextStyle(
                        color: Colors.deepPurpleAccent, fontSize: 16)),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white10,
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                controller: _textController,
                style: const TextStyle(color: Colors.white, fontSize: 16),
                maxLines: 8,
                maxLength: 280,
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: "What's here? Leave a memory...",
                  hintStyle: TextStyle(color: Colors.white38),
                  border: InputBorder.none,
                  counterStyle: TextStyle(color: Colors.white38),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.deepPurple.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: Colors.deepPurpleAccent.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.location_on,
                      color: Colors.deepPurpleAccent, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Visible to everyone within 150m of this spot.',
                      style:
                          TextStyle(color: Colors.white54, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
