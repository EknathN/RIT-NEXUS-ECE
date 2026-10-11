import 'package:flutter_test/flutter_test.dart';
import 'package:rit_ece/main.dart';

void main() {
  testWidgets('RIT ECE app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const RitEceApp());
    expect(find.text('RIT ECE'), findsWidgets);
  });
}
