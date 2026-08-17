import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../models/deck_model.dart';

/// Modal dialog for creating or editing a Deck.
class EditDeckDialog extends StatefulWidget {
  final DeckModel? initialDeck;
  final Function(String title, String description, int colorCode) onSave;

  const EditDeckDialog({
    super.key,
    this.initialDeck,
    required this.onSave,
  });

  @override
  State<EditDeckDialog> createState() => _EditDeckDialogState();
}

class _EditDeckDialogState extends State<EditDeckDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descController;
  late int _selectedColorCode;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialDeck?.title ?? '');
    _descController = TextEditingController(text: widget.initialDeck?.description ?? '');
    _selectedColorCode = widget.initialDeck?.colorCode ?? AppConstants.defaultDeckColors.first;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      widget.onSave(
        _titleController.text.trim(),
        _descController.text.trim(),
        _selectedColorCode,
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEditing = widget.initialDeck != null;

    return Dialog(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 460),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Text(
                isEditing ? 'Chỉnh sửa bộ từ' : 'Tạo bộ từ mới',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 20),

              // Title Field
              TextFormField(
                controller: _titleController,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Tên bộ từ *',
                  hintText: 'Ví dụ: IELTS Essential, Oxford 3000...',
                  prefixIcon: Icon(Icons.style_outlined),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Vui lòng nhập tên bộ từ';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Description Field
              TextFormField(
                controller: _descController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Mô tả (tùy chọn)',
                  hintText: 'Mục tiêu học, cấp độ từ vựng...',
                  prefixIcon: Icon(Icons.notes_rounded),
                ),
              ),
              const SizedBox(height: 20),

              // Color Preset Selector
              Text(
                'Màu sắc chủ đề',
                style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: AppConstants.defaultDeckColors.map((colorInt) {
                  final color = Color(colorInt);
                  final isSelected = _selectedColorCode == colorInt;

                  return GestureDetector(
                    onTap: () => setState(() => _selectedColorCode = colorInt),
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isSelected ? Colors.white : Colors.transparent,
                          width: 2.5,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: color.withOpacity(0.5),
                                  blurRadius: 8,
                                  spreadRadius: 2,
                                )
                              ]
                            : null,
                      ),
                      child: isSelected
                          ? const Icon(Icons.check_rounded, color: Colors.white, size: 20)
                          : null,
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 28),

              // Buttons
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
                      backgroundColor: Color(_selectedColorCode),
                      foregroundColor: Colors.white,
                    ),
                    child: Text(isEditing ? 'Lưu thay đổi' : 'Tạo bộ từ'),
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
