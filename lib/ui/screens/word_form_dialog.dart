import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../models/word_model.dart';
import '../../models/word_status.dart';
import '../widgets/ipa_keyboard.dart';

/// Modal dialog or full form for creating and updating vocabulary words with extended metadata.
class WordFormDialog extends StatefulWidget {
  final WordModel? initialWord;
  final String deckId;
  final Function(
    String term,
    String partOfSpeech,
    String phonetic,
    String definitionVi,
    String? exampleSentence,
    String? note,
    WordStatus status,
    List<String> synonyms,
    List<String> antonyms,
    List<String> collocations,
    String? cefrLevel,
  ) onSave;

  const WordFormDialog({
    super.key,
    this.initialWord,
    required this.deckId,
    required this.onSave,
  });

  @override
  State<WordFormDialog> createState() => _WordFormDialogState();
}

class _WordFormDialogState extends State<WordFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _termController;
  late final TextEditingController _posController;
  late final TextEditingController _phoneticController;
  late final TextEditingController _defController;
  late final TextEditingController _exampleController;
  late final TextEditingController _noteController;
  late final TextEditingController _synonymsController;
  late final TextEditingController _antonymsController;
  late final TextEditingController _collocationsController;

  late WordStatus _selectedStatus;
  String? _selectedCefrLevel;

  static const List<String> _cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  @override
  void initState() {
    super.initState();
    final word = widget.initialWord;
    _termController = TextEditingController(text: word?.term ?? '');
    _posController = TextEditingController(text: word?.partOfSpeech.isNotEmpty == true ? word!.partOfSpeech : 'noun');
    _phoneticController = TextEditingController(text: word?.phonetic ?? '');
    _defController = TextEditingController(text: word?.definitionVi ?? '');
    _exampleController = TextEditingController(text: word?.exampleSentence ?? '');
    _noteController = TextEditingController(text: word?.note ?? '');
    _synonymsController = TextEditingController(text: word?.synonyms.join(', ') ?? '');
    _antonymsController = TextEditingController(text: word?.antonyms.join(', ') ?? '');
    _collocationsController = TextEditingController(text: word?.collocations.join(', ') ?? '');
    _selectedStatus = word?.status ?? WordStatus.newWord;
    _selectedCefrLevel = word?.cefrLevel;
  }

  @override
  void dispose() {
    _termController.dispose();
    _posController.dispose();
    _phoneticController.dispose();
    _defController.dispose();
    _exampleController.dispose();
    _noteController.dispose();
    _synonymsController.dispose();
    _antonymsController.dispose();
    _collocationsController.dispose();
    super.dispose();
  }

  List<String> _parseList(String raw) {
    return raw
        .split(RegExp(r'[,;\n]+'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      widget.onSave(
        _termController.text.trim(),
        _posController.text.trim(),
        _phoneticController.text.trim(),
        _defController.text.trim(),
        _exampleController.text.trim().isEmpty ? null : _exampleController.text.trim(),
        _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
        _selectedStatus,
        _parseList(_synonymsController.text),
        _parseList(_antonymsController.text),
        _parseList(_collocationsController.text),
        _selectedCefrLevel,
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEditing = widget.initialWord != null;

    return Dialog(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 560, maxHeight: 720),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEditing ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng mới',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
              const SizedBox(height: 16),

              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Term Field
                      TextFormField(
                        controller: _termController,
                        autofocus: !isEditing,
                        decoration: const InputDecoration(
                          labelText: 'Từ vựng tiếng Anh *',
                          hintText: 'Ví dụ: Resilient, Ubiquitous...',
                          prefixIcon: Icon(Icons.spellcheck_rounded),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Vui lòng nhập từ tiếng Anh';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // 2. Part of Speech & CEFR Level Row
                      Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: DropdownButtonFormField<String>(
                              initialValue: AppConstants.partsOfSpeech.contains(_posController.text.toLowerCase())
                                  ? _posController.text.toLowerCase()
                                  : AppConstants.partsOfSpeech.first,
                              decoration: const InputDecoration(
                                labelText: 'Từ loại',
                                prefixIcon: Icon(Icons.category_outlined),
                              ),
                              items: AppConstants.partsOfSpeech.map((pos) {
                                return DropdownMenuItem(
                                  value: pos,
                                  child: Text(pos),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) _posController.text = val;
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: DropdownButtonFormField<String?>(
                              initialValue: _selectedCefrLevel,
                              decoration: const InputDecoration(
                                labelText: 'Cấp độ CEFR',
                                prefixIcon: Icon(Icons.military_tech_outlined),
                              ),
                              items: [
                                const DropdownMenuItem<String?>(
                                  value: null,
                                  child: Text('Không có'),
                                ),
                                ..._cefrLevels.map((lvl) {
                                  return DropdownMenuItem<String?>(
                                    value: lvl,
                                    child: Text(lvl, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  );
                                }),
                              ],
                              onChanged: (val) => setState(() => _selectedCefrLevel = val),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // 3. Phonetic (IPA) Input Field with Virtual Keyboard Button
                      TextFormField(
                        controller: _phoneticController,
                        decoration: InputDecoration(
                          labelText: 'Phiên âm IPA',
                          hintText: '/rɪˈzɪl.jənt/',
                          prefixIcon: const Icon(Icons.record_voice_over_outlined),
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.keyboard_alt_outlined, color: Color(0xFF4F46E5)),
                            tooltip: 'Mở bàn phím ký tự IPA',
                            onPressed: () {
                              IpaKeyboard.show(context, _phoneticController);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // 4. Vietnamese Definition Field
                      TextFormField(
                        controller: _defController,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Định nghĩa tiếng Việt *',
                          hintText: 'Kiên cường, có khả năng phục hồi nhanh...',
                          prefixIcon: Icon(Icons.translate_rounded),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Vui lòng nhập định nghĩa tiếng Việt';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // 5. Example Sentence Field
                      TextFormField(
                        controller: _exampleController,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Câu ví dụ (tùy chọn)',
                          hintText: 'She remained resilient in the face of adversity.',
                          prefixIcon: Icon(Icons.format_quote_rounded),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // 6. Synonyms & Antonyms Fields
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _synonymsController,
                              decoration: const InputDecoration(
                                labelText: 'Từ đồng nghĩa (Synonyms)',
                                hintText: 'tough, flexible, adaptable',
                                prefixIcon: Icon(Icons.compare_arrows_rounded),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _antonymsController,
                              decoration: const InputDecoration(
                                labelText: 'Từ trái nghĩa (Antonyms)',
                                hintText: 'fragile, weak, brittle',
                                prefixIcon: Icon(Icons.swap_horiz_rounded),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // 7. Collocations Field
                      TextFormField(
                        controller: _collocationsController,
                        decoration: const InputDecoration(
                          labelText: 'Cụm từ đi kèm (Collocations)',
                          hintText: 'resilient economy, highly resilient',
                          prefixIcon: Icon(Icons.hub_outlined),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // 8. Note Field
                      TextFormField(
                        controller: _noteController,
                        decoration: const InputDecoration(
                          labelText: 'Ghi chú thêm',
                          hintText: 'Mẹo nhớ từ, ngữ cảnh sử dụng...',
                          prefixIcon: Icon(Icons.edit_note_rounded),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // 9. Status Selector
                      Text(
                        'Trạng thái ghi nhớ',
                        style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: WordStatus.values.map((status) {
                          final isSelected = _selectedStatus == status;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(status.labelVi),
                              selected: isSelected,
                              onSelected: (selected) {
                                if (selected) setState(() => _selectedStatus = status);
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Action Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Hủy'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: Colors.white,
                    ),
                    child: Text(isEditing ? 'Lưu cập nhật' : 'Thêm từ'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
