import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/errors/app_exception.dart';
import '../core/services/database_service.dart';

/// Service handling Firebase Authentication operations.
///
/// Supports Email/Password, Anonymous (Guest Mode), Password Reset, and Session Management.
/// Implements safe fallback handling when Firebase is offline or not configured.
class AuthService {
  final FirebaseAuth? _firebaseAuth;
  final DatabaseService _dbService;

  AuthService({
    FirebaseAuth? firebaseAuth,
    DatabaseService? dbService,
  })  : _dbService = dbService ?? DatabaseService.instance,
        _firebaseAuth = firebaseAuth ??
            (DatabaseService.instance.isFirebaseAvailable
                ? FirebaseAuth.instance
                : null);

  /// Whether Firebase Auth instance is actively available on this platform.
  bool get isAvailable => _firebaseAuth != null && _dbService.isFirebaseAvailable;

  /// The currently signed-in Firebase [User], or `null` if unauthenticated.
  User? get currentUser => isAvailable ? _firebaseAuth?.currentUser : null;

  /// Stream of authentication state changes.
  Stream<User?> get authStateChanges {
    if (!isAvailable) {
      return Stream.value(null);
    }
    return _firebaseAuth!.authStateChanges();
  }

  /// Whether the user is currently authenticated with a non-null UID.
  bool get isAuthenticated => currentUser != null;

  /// Returns the current active user ID, or an empty string if guest.
  String get currentUserId => currentUser?.uid ?? '';

  // ===========================================================================
  // AUTHENTICATION METHODS
  // ===========================================================================

  /// Signs up a new user with [email] and [password].
  Future<UserCredential> signUpWithEmailAndPassword({
    required String email,
    required String password,
    String? displayName,
  }) async {
    _ensureFirebaseAvailable();

    try {
      debugPrint('[AuthService] Creating user account for: $email');
      final credential = await _firebaseAuth!.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      if (displayName != null && displayName.trim().isNotEmpty) {
        await credential.user?.updateDisplayName(displayName.trim());
        await credential.user?.reload();
      }

      debugPrint('[AuthService] Successfully registered user: ${credential.user?.uid}');
      return credential;
    } on FirebaseAuthException catch (e) {
      debugPrint('[AuthService] SignUp FirebaseAuthException: ${e.code} - ${e.message}');
      throw _handleAuthException(e);
    } catch (e, stackTrace) {
      debugPrint('[AuthService] SignUp Error: $e\n$stackTrace');
      throw AppException(
        'Đăng ký tài khoản không thành công: $e',
        code: 'SIGNUP_FAILED',
        originalError: e,
      );
    }
  }

  /// Signs in an existing user with [email] and [password].
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    _ensureFirebaseAvailable();

    try {
      debugPrint('[AuthService] Signing in user: $email');
      final credential = await _firebaseAuth!.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      debugPrint('[AuthService] Successfully signed in: ${credential.user?.uid}');
      return credential;
    } on FirebaseAuthException catch (e) {
      debugPrint('[AuthService] SignIn FirebaseAuthException: ${e.code} - ${e.message}');
      throw _handleAuthException(e);
    } catch (e, stackTrace) {
      debugPrint('[AuthService] SignIn Error: $e\n$stackTrace');
      throw AppException(
        'Đăng nhập không thành công: $e',
        code: 'SIGNIN_FAILED',
        originalError: e,
      );
    }
  }

  /// Signs in anonymously as a Guest.
  Future<UserCredential> signInAnonymously() async {
    _ensureFirebaseAvailable();

    try {
      debugPrint('[AuthService] Signing in anonymously (Guest Mode)...');
      final credential = await _firebaseAuth!.signInAnonymously();
      debugPrint('[AuthService] Signed in as guest: ${credential.user?.uid}');
      return credential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw AppException('Không thể đăng nhập chế độ Khách: $e', code: 'GUEST_SIGNIN_FAILED');
    }
  }

  /// Sends a password reset email to [email].
  Future<void> sendPasswordResetEmail(String email) async {
    _ensureFirebaseAvailable();

    try {
      debugPrint('[AuthService] Sending password reset email to: $email');
      await _firebaseAuth!.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw AppException('Gửi email đặt lại mật khẩu thất bại: $e', code: 'RESET_PASSWORD_FAILED');
    }
  }

  /// Signs out the current user session.
  Future<void> signOut() async {
    if (!isAvailable) return;

    try {
      debugPrint('[AuthService] Signing out user: ${currentUser?.uid}');
      await _firebaseAuth!.signOut();
    } catch (e, stackTrace) {
      debugPrint('[AuthService] SignOut Error: $e\n$stackTrace');
      throw AppException('Đăng xuất thất bại: $e', code: 'SIGNOUT_FAILED', originalError: e);
    }
  }

  // ===========================================================================
  // ERROR TRANSLATOR & HELPERS
  // ===========================================================================

  void _ensureFirebaseAvailable() {
    if (!isAvailable) {
      throw const AppException(
        'Dịch vụ Firebase hiện chưa sẵn sàng hoặc đang chạy chế độ Offline.',
        code: 'FIREBASE_UNAVAILABLE',
      );
    }
  }

  AppException _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return const AppException('Không tìm thấy tài khoản với email này.', code: 'USER_NOT_FOUND');
      case 'wrong-password':
      case 'invalid-credential':
        return const AppException('Mật khẩu không chính xác hoặc thông tin đăng nhập không hợp lệ.', code: 'WRONG_PASSWORD');
      case 'email-already-in-use':
        return const AppException('Địa chỉ email này đã được sử dụng bởi một tài khoản khác.', code: 'EMAIL_IN_USE');
      case 'invalid-email':
        return const AppException('Địa chỉ email không đúng định dạng.', code: 'INVALID_EMAIL');
      case 'weak-password':
        return const AppException('Mật khẩu quá yếu. Vui lòng đặt tối thiểu 6 ký tự.', code: 'WEAK_PASSWORD');
      case 'user-disabled':
        return const AppException('Tài khoản này đã bị vô hiệu hóa.', code: 'USER_DISABLED');
      case 'too-many-requests':
        return const AppException('Quá nhiều lần thử không hợp lệ. Vui lòng chờ vài phút rồi thử lại.', code: 'TOO_MANY_REQUESTS');
      case 'network-request-failed':
        return const AppException('Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền Internet.', code: 'NETWORK_ERROR');
      default:
        return AppException(
          e.message ?? 'Đã xảy ra lỗi xác thực tài khoản.',
          code: e.code,
          originalError: e,
        );
    }
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Provides the singleton [AuthService] instance.
final authServiceProvider = Provider<AuthService>((ref) {
  final dbService = ref.watch(databaseServiceProvider);
  return AuthService(dbService: dbService);
});

/// Stream of authentication state changes for reactive UI.
final authStateProvider = StreamProvider<User?>((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.authStateChanges;
});

/// Provides the currently logged-in user or null.
final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value;
});
