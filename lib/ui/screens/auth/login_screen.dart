import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../state/auth_controller.dart';
import 'register_screen.dart';

/// Screen allowing existing users to sign in or continue as Guest.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authControllerProvider.notifier).signIn(
          _emailController.text,
          _passwordController.text,
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đăng nhập thành công!'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.of(context).pop(true);
    }
  }

  Future<void> _handleGuestMode() async {
    final success = await ref.read(authControllerProvider.notifier).continueAsGuest();
    if (success && mounted) {
      Navigator.of(context).pop(true);
    }
  }

  void _showForgotPasswordDialog() {
    final resetEmailController = TextEditingController(text: _emailController.text);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Quên mật khẩu?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Nhập địa chỉ email của bạn. Chúng tôi sẽ gửi một liên kết để bạn đặt lại mật khẩu mới.',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: resetEmailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Địa chỉ Email',
                prefixIcon: Icon(Icons.email_outlined),
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              final email = resetEmailController.text.trim();
              if (email.isNotEmpty && email.contains('@')) {
                Navigator.of(ctx).pop();
                final sent = await ref
                    .read(authControllerProvider.notifier)
                    .sendPasswordReset(email);
                if (sent && mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Đã gửi email khôi phục tới $email'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              }
            },
            child: const Text('Gửi liên kết'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Đăng nhập VocaFlow'),
      ),
      body: Stack(
        children: [
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // App Logo & Header
                      Center(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.cloud_sync_rounded,
                            size: 54,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Chào mừng bạn trở lại!',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Đăng nhập để đồng bộ từ vựng tự động trên mọi thiết bị.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.7),
                        ),
                      ),
                      const SizedBox(height: 28),

                      // Error message Banner
                      if (authState.errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded, color: Colors.red, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  authState.errorMessage!,
                                  style: const TextStyle(color: Colors.red, fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Email Field
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          hintText: 'example@email.com',
                          prefixIcon: Icon(Icons.email_outlined),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Vui lòng nhập địa chỉ email.';
                          }
                          if (!val.contains('@') || !val.contains('.')) {
                            return 'Địa chỉ email không đúng định dạng.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Password Field
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _handleLogin(),
                        decoration: InputDecoration(
                          labelText: 'Mật khẩu',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                        ),
                        validator: (val) {
                          if (val == null || val.isEmpty) {
                            return 'Vui lòng nhập mật khẩu.';
                          }
                          if (val.length < 6) {
                            return 'Mật khẩu phải từ 6 ký tự trở lên.';
                          }
                          return null;
                        },
                      ),

                      // Forgot Password Link
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _showForgotPasswordDialog,
                          child: const Text('Quên mật khẩu?'),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Login Submit Button
                      SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: theme.colorScheme.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: authState.isLoading ? null : _handleLogin,
                          child: const Text(
                            'Đăng nhập',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Divider "Hoặc"
                      Row(
                        children: [
                          Expanded(child: Divider(color: theme.dividerColor)),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              'HOẶC',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.textTheme.bodySmall?.color?.withValues(alpha: 0.5),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          Expanded(child: Divider(color: theme.dividerColor)),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Guest Mode Button
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: authState.isLoading ? null : _handleGuestMode,
                        icon: const Icon(Icons.person_outline_rounded),
                        label: const Text('Tiếp tục với chế độ Khách (Offline)'),
                      ),
                      const SizedBox(height: 24),

                      // Register Navigation
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('Chưa có tài khoản?'),
                          TextButton(
                            onPressed: () {
                              Navigator.of(context).pushReplacement(
                                MaterialPageRoute(builder: (_) => const RegisterScreen()),
                              );
                            },
                            child: const Text(
                              'Đăng ký ngay',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Loading Overlay
          if (authState.isLoading)
            Container(
              color: Colors.black45,
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
        ],
      ),
    );
  }
}
