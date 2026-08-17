import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your VocaFlow Firebase apps.
///
/// Generated specifically for project: `vocaflow-e866c`.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.macOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAM2KmHJzVLvd-oMbLj0AZKXeSiX-Hgv8I',
    appId: '1:123733506844:web:6787f658b2999f557c98d9',
    messagingSenderId: '123733506844',
    projectId: 'vocaflow-e866c',
    authDomain: 'vocaflow-e866c.firebaseapp.com',
    databaseURL: 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'vocaflow-e866c.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyAM2KmHJzVLvd-oMbLj0AZKXeSiX-Hgv8I',
    appId: '1:123733506844:web:6787f658b2999f557c98d9',
    messagingSenderId: '123733506844',
    projectId: 'vocaflow-e866c',
    authDomain: 'vocaflow-e866c.firebaseapp.com',
    storageBucket: 'vocaflow-e866c.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAM2KmHJzVLvd-oMbLj0AZKXeSiX-Hgv8I',
    appId: '1:123733506844:web:6787f658b2999f557c98d9',
    messagingSenderId: '123733506844',
    projectId: 'vocaflow-e866c',
    authDomain: 'vocaflow-e866c.firebaseapp.com',
    storageBucket: 'vocaflow-e866c.firebasestorage.app',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'AIzaSyAM2KmHJzVLvd-oMbLj0AZKXeSiX-Hgv8I',
    appId: '1:123733506844:web:6787f658b2999f557c98d9',
    messagingSenderId: '123733506844',
    projectId: 'vocaflow-e866c',
    authDomain: 'vocaflow-e866c.firebaseapp.com',
    databaseURL: 'https://vocaflow-e866c-default-rtdb.asia-southeast1.firebasedatabase.app',
    storageBucket: 'vocaflow-e866c.firebasestorage.app',
  );
}
