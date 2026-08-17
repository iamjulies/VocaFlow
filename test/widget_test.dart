import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:vocaflow/main.dart';

void main() {
  testWidgets('VocaFlow App boots successfully', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: VocaFlowApp(),
      ),
    );

    expect(find.byType(VocaFlowApp), findsOneWidget);
  });
}
