import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../models/echo.dart';

class EchoDetailScreen extends StatelessWidget {
  final Echo echo;

  const EchoDetailScreen({super.key, required this.echo});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Echo'),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (echo.imageUrl != null)
              CachedNetworkImage(
                imageUrl: echo.imageUrl!,
                height: 300,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  height: 300,
                  color: Colors.white10,
                  child: const Center(child: CircularProgressIndicator()),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: Colors.deepPurple,
                        backgroundImage: echo.creatorPhotoUrl != null
                            ? NetworkImage(echo.creatorPhotoUrl!)
                            : null,
                        child: echo.creatorPhotoUrl == null
                            ? Text(
                                echo.creatorName.isNotEmpty ? echo.creatorName[0].toUpperCase() : '?',
                                style: const TextStyle(color: Colors.white),
                              )
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            echo.creatorName,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            DateFormat('MMM d, yyyy · h:mm a').format(echo.createdAt),
                            style: const TextStyle(color: Colors.white38, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (echo.text != null) ...[
                    const SizedBox(height: 20),
                    Text(
                      echo.text!,
                      style: const TextStyle(color: Colors.white, fontSize: 17, height: 1.5),
                    ),
                  ],
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      const Icon(Icons.visibility, color: Colors.white38, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        '${echo.viewCount} view${echo.viewCount == 1 ? '' : 's'}',
                        style: const TextStyle(color: Colors.white38, fontSize: 13),
                      ),
                      const SizedBox(width: 20),
                      const Icon(Icons.location_on, color: Colors.white38, size: 16),
                      const SizedBox(width: 6),
                      Text(
                        '${echo.lat.toStringAsFixed(4)}, ${echo.lng.toStringAsFixed(4)}',
                        style: const TextStyle(color: Colors.white38, fontSize: 13),
                      ),
                    ],
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
