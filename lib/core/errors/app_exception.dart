/// Base exception class for VocaFlow
class AppException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  const AppException(this.message, {this.code, this.originalError});

  @override
  String toString() => 'AppException(code: $code, message: $message)';
}

/// Database related exceptions
class DatabaseException extends AppException {
  const DatabaseException(super.message, {super.code, super.originalError});
}

/// Not found exceptions (e.g. Deck or Word not found)
class NotFoundException extends AppException {
  const NotFoundException(super.message, {super.code, super.originalError});
}
