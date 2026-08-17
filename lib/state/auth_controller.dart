import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/errors/app_exception.dart';
import '../services/auth_service.dart';

/// State representation for user authentication.
@immutable
class AuthState {
  final User? user;
  final bool isLoading;
  final String? errorMessage;
  final bool isGuest;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.errorMessage,
    this.isGuest = false,
  });

  bool get isAuthenticated => user != null;
  String get userId => user?.uid ?? '';
  String get email => user?.email ?? '';
  String get displayName => user?.displayName ?? (isGuest ? 'Khách (Offline)' : 'Người học VocaFlow');

  AuthState copyWith({
    User? user,
    bool? isLoading,
    String? errorMessage,
    bool? isGuest,
    bool clearError = false,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isGuest: isGuest ?? this.isGuest,
    );
  }

  @override
  String toString() =>
      'AuthState(authenticated: $isAuthenticated, uid: $userId, guest: $isGuest, loading: $isLoading, error: $errorMessage)';
}

/// StateNotifier managing user login, registration, password recovery, and session state.
class AuthController extends StateNotifier<AuthState> {
  final AuthService _authService;

  AuthController({required AuthService authService})
      : _authService = authService,
        super(AuthState(
          user: authService.currentUser,
          isGuest: authService.currentUser?.isAnonymous ?? false,
        )) {
    // Listen to Firebase Auth state stream
    _authService.authStateChanges.listen((user) {
      if (mounted) {
        state = state.copyWith(
          user: user,
          isGuest: user?.isAnonymous ?? false,
          isLoading: false,
          clearError: true,
        );
      }
    });
  }

  /// Signs in an existing user with [email] and [password].
  Future<bool> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final credential = await _authService.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      state = state.copyWith(
        user: credential.user,
        isGuest: false,
        isLoading: false,
        clearError: true,
      );
      return true;
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Đăng nhập thất bại: $e');
      return false;
    }
  }

  /// Registers a new user account with [email] and [password].
  Future<bool> signUp({
    required String email,
    required String password,
    String? displayName,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final credential = await _authService.signUpWithEmailAndPassword(
        email: email,
        password: password,
        displayName: displayName,
      );
      state = state.copyWith(
        user: credential.user,
        isGuest: false,
        isLoading: false,
        clearError: true,
      );
      return true;
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Đăng ký thất bại: $e');
      return false;
    }
  }

  /// Enters Guest Mode (Anonymous login or offline local session).
  Future<bool> continueAsGuest() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      if (_authService.isAvailable) {
        final credential = await _authService.signInAnonymously();
        state = state.copyWith(
          user: credential.user,
          isGuest: true,
          isLoading: false,
          clearError: true,
        );
      } else {
        // Pure offline fallback guest session
        state = state.copyWith(
          isGuest: true,
          isLoading: false,
          clearError: true,
        );
      }
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Không thể vào chế độ Khách: $e');
      return false;
    }
  }

  /// Sends a password reset email.
  Future<bool> sendPasswordReset(String email) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _authService.sendPasswordResetEmail(email);
      state = state.copyWith(isLoading: false, clearError: true);
      return true;
    } on AppException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Không thể gửi email đặt lại mật khẩu: $e');
      return false;
    }
  }

  /// Signs out of the current user session.
  Future<void> signOut() async {
    state = state.copyWith(isLoading: true);
    try {
      await _authService.signOut();
      state = const AuthState(user: null, isLoading: false, isGuest: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: 'Đăng xuất thất bại: $e');
    }
  }

  /// Clears any pending error message.
  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Global StateNotifierProvider for authentication controller.
final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthController(authService: authService);
});
