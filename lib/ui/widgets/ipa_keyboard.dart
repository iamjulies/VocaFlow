import 'package:flutter/material.dart';
import '../../core/themes/app_theme.dart';

/// Interactive International Phonetic Alphabet (IPA) virtual keyboard widget.
///
/// Designed to type standard English IPA symbols easily across mobile & desktop.
class IpaKeyboard extends StatefulWidget {
  final TextEditingController controller;
  final VoidCallback? onClose;

  const IpaKeyboard({
    super.key,
    required this.controller,
    this.onClose,
  });

  /// Displays the [IpaKeyboard] as a modal bottom sheet.
  static Future<void> show(BuildContext context, TextEditingController controller) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => IpaKeyboard(
        controller: controller,
        onClose: () => Navigator.of(ctx).pop(),
      ),
    );
  }

  @override
  State<IpaKeyboard> createState() => _IpaKeyboardState();
}

class _IpaKeyboardState extends State<IpaKeyboard> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  static const List<String> _monophthongs = [
    'iː', 'ɪ', 'ʊ', 'uː',
    'e', 'ə', 'ɜː', 'ɔː',
    'æ', 'ʌ', 'ɑː', 'ɒ',
  ];

  static const List<String> _diphthongs = [
    'eɪ', 'aɪ', 'ɔɪ',
    'əʊ', 'aʊ', 'ɪə',
    'eə', 'ʊə',
  ];

  static const List<String> _consonants = [
    'p', 'b', 't', 'd', 'tʃ', 'dʒ',
    'k', 'ɡ', 'f', 'v', 'θ', 'ð',
    's', 'z', 'ʃ', 'ʒ', 'm', 'n',
    'ŋ', 'h', 'l', 'r', 'w', 'j',
  ];

  static const List<String> _specialAndStress = [
    'ˈ', 'ˌ', 'ː', '.', '/', '(', ')', '-',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _insertText(String symbol) {
    final controller = widget.controller;
    final text = controller.text;
    final selection = controller.selection;

    final start = selection.start >= 0 ? selection.start : text.length;
    final end = selection.end >= 0 ? selection.end : text.length;

    final newText = text.replaceRange(start, end, symbol);
    controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: start + symbol.length),
    );
  }

  void _backspace() {
    final controller = widget.controller;
    final text = controller.text;
    final selection = controller.selection;

    if (text.isEmpty) return;

    final start = selection.start >= 0 ? selection.start : text.length;
    final end = selection.end >= 0 ? selection.end : text.length;

    if (start != end) {
      final newText = text.replaceRange(start, end, '');
      controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: start),
      );
    } else if (start > 0) {
      // Check if previous characters form a multi-char symbol (e.g. "iː", "tʃ", "dʒ")
      int deleteCount = 1;
      if (start >= 2) {
        final lastTwo = text.substring(start - 2, start);
        if (['iː', 'uː', 'ɜː', 'ɔː', 'ɑː', 'eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'ɪə', 'eə', 'ʊə', 'tʃ', 'dʒ'].contains(lastTwo)) {
          deleteCount = 2;
        }
      }

      final newText = text.replaceRange(start - deleteCount, start, '');
      controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: start - deleteCount),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      constraints: const BoxConstraints(maxHeight: 380),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Bar: Tabs & Close / Backspace
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: theme.dividerColor.withOpacity(0.1),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TabBar(
                      controller: _tabController,
                      isScrollable: true,
                      tabAlignment: TabAlignment.start,
                      labelColor: AppTheme.primaryColor,
                      unselectedLabelColor: theme.textTheme.bodySmall?.color,
                      labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      indicatorColor: AppTheme.primaryColor,
                      indicatorSize: TabBarIndicatorSize.label,
                      dividerColor: Colors.transparent,
                      tabs: const [
                        Tab(text: 'Nguyên âm đơn'),
                        Tab(text: 'Nguyên âm đôi'),
                        Tab(text: 'Phụ âm'),
                        Tab(text: 'Trọng âm & Ký tự'),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Backspace Button
                  IconButton(
                    onPressed: _backspace,
                    icon: const Icon(Icons.backspace_outlined, size: 20),
                    tooltip: 'Xóa ký tự',
                    visualDensity: VisualDensity.compact,
                  ),

                  // Close / Done Button
                  IconButton(
                    onPressed: widget.onClose ?? () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.keyboard_hide_rounded, size: 22),
                    tooltip: 'Đóng bàn phím',
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ),

            // Tab Views: Symbol Grids
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildSymbolGrid(_monophthongs, 6),
                  _buildSymbolGrid(_diphthongs, 4),
                  _buildSymbolGrid(_consonants, 6),
                  _buildSymbolGrid(_specialAndStress, 4),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSymbolGrid(List<String> symbols, int crossAxisCount) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final effectiveCols = constraints.maxWidth > 600 ? crossAxisCount + 2 : crossAxisCount;

        return GridView.builder(
          padding: const EdgeInsets.all(12),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: effectiveCols,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            childAspectRatio: 1.6,
          ),
          itemCount: symbols.length,
          itemBuilder: (context, index) {
            final symbol = symbols[index];
            return _buildKeyButton(symbol);
          },
        );
      },
    );
  }

  Widget _buildKeyButton(String symbol) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Material(
      color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: () => _insertText(symbol),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: theme.dividerColor.withOpacity(0.08),
            ),
          ),
          child: Text(
            symbol,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              fontFamily: 'monospace',
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
        ),
      ),
    );
  }
}
