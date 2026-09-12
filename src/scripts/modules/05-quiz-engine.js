// =========================================================================

// VOCAFLOW 05-QUIZ-ENGINE.JS (v0.10.9-48)

// Quiz study mode, scoring, question generation, AI explanation & Mistake Notebook

// =========================================================================

    // =========================================================================
    // QUIZ MODE ENGINE (EASY, MEDIUM, HARD, EXTREME + AI PREFETCH & CACHE) (v0.0.9.11)
    // =========================================================================
    let quizList = [];
    let quizIndex = 0;
    let quizScore = 0;
    let quizIsAnswered = false;
    let quizStartTime = 0;
    let quizActiveTimeMs = 0;
    let quizQuestionStartTime = null;
    let quizCorrectCount = 0;
    let quizWrongCount = 0;
    let quizPointsEarned = 0;
    let quizHintsUsed = 0;
    let quizSkipCount = 0;
    let quizTotalQuestions = 0;
    let fireworksAnimationId = null;

    let currentQuizDifficulty = localStorage.getItem('vocaflow_quiz_difficulty') || 'easy';
    let quizSetupUseSelection = false;
    let quizSetupCustomWordList = null;
    let selectedSetupDifficulty = 'easy';

    // Persistent LocalStorage + Session AI Distractors Cache to minimize API quota
    let quizAiDistractorCache = {};
    try {
      const savedAiCache = localStorage.getItem('vocaflow_ai_distractors_cache_v4');
      if (savedAiCache) quizAiDistractorCache = JSON.parse(savedAiCache);
    } catch (e) {
      quizAiDistractorCache = {};
    }

    function saveAiDistractorCache() {
      try {
        localStorage.setItem('vocaflow_ai_distractors_cache_v4', JSON.stringify(quizAiDistractorCache));
      } catch (e) {}
    }

    function getDifficultyLabel(diff) {
      if (diff === 'extreme') return '🟣 Cực Khó (x2.5)';
      if (diff === 'hard') return '🔴 Khó (x2.0)';
      if (diff === 'medium') return '🟡 Bình thường (x1.5)';
      return '🟢 Dễ (x1.0)';
    }

    function getDifficultyMultiplier(diff = currentQuizDifficulty) {
      if (diff === 'extreme') return 2.5;
      if (diff === 'hard') return 2.0;
      if (diff === 'medium') return 1.5;
      return 1.0;
    }

    function openQuizSetupModal(useSelectionOnly = false, customWordList = null) {
      dismissMiniAutoFlashcardIfActive();
      quizSetupUseSelection = useSelectionOnly;
      quizSetupCustomWordList = customWordList;

      let deckWords = customWordList || getFilteredDeckWords();
      if (!customWordList && useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      }

      if (deckWords.length < 2) {
        alert('Cần tối thiểu 2 từ vựng để tạo bài trắc nghiệm Quiz!');
        return;
      }

      const deck = decks.find(d => d.id === currentDeckId);
      const subtitle = document.getElementById('quiz-setup-subtitle');
      if (subtitle) {
        if (customWordList) {
          subtitle.textContent = '🔔 Hàng đợi ôn tập hôm nay • Tổng số câu: ' + deckWords.length + ' câu hỏi';
        } else {
          subtitle.textContent = 'VocaDeck: "' + (deck ? deck.title : 'Từ vựng đã chọn') + '" • Tổng số câu: ' + deckWords.length + ' câu hỏi';
        }
      }

      let savedDiff = localStorage.getItem('vocaflow_quiz_difficulty') || 'easy';
      if (!['easy', 'medium', 'hard', 'extreme'].includes(savedDiff)) savedDiff = 'easy';
      selectQuizSetupDifficulty(savedDiff);

      // Render visual lock indicators on cards if no API key
      const hasKey = hasAtLeastOneApiKey();
      ['medium', 'hard', 'extreme'].forEach(k => {
        const card = document.getElementById('quiz-diff-card-' + k);
        if (card) {
          let badge = card.querySelector('.quiz-key-lock-badge');
          if (!hasKey) {
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'quiz-key-lock-badge badge';
              badge.style.cssText = 'background: rgba(99, 102, 241, 0.18); color: #818cf8; font-size: 10px; font-weight: 700; margin-left: 6px; border: 1px solid rgba(99, 102, 241, 0.3);';
              badge.textContent = '⚡ Bẫy Cục Bộ';
              const titleWrapper = card.querySelector('strong');
              if (titleWrapper && titleWrapper.parentNode) titleWrapper.parentNode.appendChild(badge);
            }
          } else {
            card.style.opacity = '1';
            if (badge) badge.remove();
          }
        }
      });

      const shuffleCb = document.getElementById('quiz-setup-shuffle-checkbox');
      if (shuffleCb) shuffleCb.checked = isStudyShuffle;

      // Zero-delay optimization: Prefetch first 3 words distractors immediately in background (only if API key present)
      if (hasKey && Array.isArray(deckWords) && deckWords.length > 0) {
        let count = 1;
        if (savedDiff === 'extreme') count = 3;
        else if (savedDiff === 'hard') count = 2;
        deckWords.slice(0, 3).forEach(w => {
          if (w) fetchAiDistractors(w, count).catch(() => {});
        });
      }

      openModal('modal-quiz-setup');
    }

    function selectQuizSetupDifficulty(diff) {
      if (!['easy', 'medium', 'hard', 'extreme'].includes(diff)) diff = 'easy';
      selectedSetupDifficulty = diff;
      const cards = {
        easy: document.getElementById('quiz-diff-card-easy'),
        medium: document.getElementById('quiz-diff-card-medium'),
        hard: document.getElementById('quiz-diff-card-hard'),
        extreme: document.getElementById('quiz-diff-card-extreme')
      };

      Object.keys(cards).forEach(k => {
        const c = cards[k];
        if (!c) return;
        if (k === diff) {
          if (k === 'easy') {
            c.style.borderColor = '#10b981';
            c.style.background = 'rgba(16, 185, 129, 0.12)';
            c.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.25)';
          } else if (k === 'medium') {
            c.style.borderColor = '#fbbf24';
            c.style.background = 'rgba(245, 158, 11, 0.12)';
            c.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.25)';
          } else if (k === 'hard') {
            c.style.borderColor = '#f87171';
            c.style.background = 'rgba(239, 68, 68, 0.12)';
            c.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.25)';
          } else if (k === 'extreme') {
            c.style.borderColor = '#c084fc';
            c.style.background = 'rgba(168, 85, 247, 0.14)';
            c.style.boxShadow = '0 0 18px rgba(168, 85, 247, 0.35)';
          }
        } else {
          c.style.borderColor = 'var(--border)';
          c.style.background = 'var(--surface-elevated)';
          c.style.boxShadow = 'none';
        }
      });
    }

    function confirmStartQuizFromModal() {
      currentQuizDifficulty = selectedSetupDifficulty || 'easy';
      localStorage.setItem('vocaflow_quiz_difficulty', currentQuizDifficulty);

      const shuffleCb = document.getElementById('quiz-setup-shuffle-checkbox');
      if (shuffleCb) {
        isStudyShuffle = shuffleCb.checked;
        localStorage.setItem('vocaflow_study_shuffle', isStudyShuffle ? 'true' : 'false');
      }

      closeModal('modal-quiz-setup');
      startQuizMode(quizSetupUseSelection, quizSetupCustomWordList);
    }

    function setQuizDifficulty(diff) {
      if (diff !== 'easy') {
        if (!currentUser || !currentUser.email) {
          alert('🔒 Cấp độ Thường, Khó và Cực Khó yêu cầu đăng nhập/đăng ký tài khoản để mở khóa!');
          openAuthModal('login');
          return;
        }
        if (!hasAtLeastOneApiKey()) {
          alert('🔒 Cấp độ ' + getDifficultyLabel(diff) + ' yêu cầu kết nối ít nhất 1 Google Gemini API Key!');
          openSettingsModal();
          return;
        }
      }
      if (!['easy', 'medium', 'hard', 'extreme'].includes(diff)) diff = 'easy';
      currentQuizDifficulty = diff;
      localStorage.setItem('vocaflow_quiz_difficulty', diff);
      updateQuizDifficultyUI();
      showToast('🎯 Đã chọn độ khó Quiz: ' + getDifficultyLabel(diff));
    }

    function cycleQuizDifficulty() {
      if (isGuest()) {
        alert('🔒 Cấp độ Thường, Khó và Cực Khó yêu cầu đăng nhập/đăng ký tài khoản để mở khóa!');
        openAuthModal('login');
        return;
      }
      if (!hasAtLeastOneApiKey()) {
        alert('🔒 Các cấp độ nâng cao yêu cầu kết nối ít nhất 1 Google Gemini API Key để sinh bẫy AI!');
        openSettingsModal();
        return;
      }
      const order = ['easy', 'medium', 'hard', 'extreme'];
      const nextIdx = (order.indexOf(currentQuizDifficulty) + 1) % order.length;
      setQuizDifficulty(order[nextIdx]);
      if (quizList && quizList.length > 0 && quizIndex < quizList.length) {
        loadQuizQuestion();
      }
    }

    function updateQuizDifficultyUI() {
      const badge = document.getElementById('quiz-difficulty-badge');
      if (badge) {
        badge.textContent = getDifficultyLabel(currentQuizDifficulty);
        if (currentQuizDifficulty === 'extreme') {
          badge.style.background = 'rgba(168, 85, 247, 0.15)';
          badge.style.color = '#c084fc';
          badge.style.borderColor = 'rgba(168, 85, 247, 0.35)';
        } else if (currentQuizDifficulty === 'hard') {
          badge.style.background = 'rgba(239, 68, 68, 0.15)';
          badge.style.color = '#f87171';
          badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
        } else if (currentQuizDifficulty === 'medium') {
          badge.style.background = 'rgba(245, 158, 11, 0.15)';
          badge.style.color = '#fbbf24';
          badge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        } else {
          badge.style.background = 'rgba(16, 185, 129, 0.15)';
          badge.style.color = '#34d399';
          badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
        }
      }
    }

    async function fetchAiDistractors(questionWord, count) {
      if (!questionWord || !count || count <= 0) return [];
      const cacheKey = (questionWord.id || questionWord.term) + '_' + count;
      if (quizAiDistractorCache[cacheKey] && Array.isArray(quizAiDistractorCache[cacheKey]) && quizAiDistractorCache[cacheKey].length >= count) {
        return quizAiDistractorCache[cacheKey].slice(0, count);
      }

      // Collect all available Gemini API keys
      let keys = [];
      if (typeof getStoredApiKeys === 'function') keys = getStoredApiKeys();
      if (keys.length === 0 && Array.isArray(window.geminiApiKeys)) keys = window.geminiApiKeys.filter(k => k && k.trim());
      if (keys.length === 0) {
        const single = (window.geminiApiKey || localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || localStorage.getItem('vocaflow_gemini_api_key') || '').trim();
        if (single) keys.push(single);
      }

      if (keys.length === 0) return [];

      const correctDef = (questionWord.definitionVi || questionWord.definition || '').trim();
      if (!correctDef) return [];
      const pos = (questionWord.partOfSpeech || questionWord.pos || 'từ vựng').trim();
      const term = (questionWord.term || '').trim();
      
      const hasParens = /\([^)]+\)/.test(correctDef);
      const isCap = /^[A-ZÀ-Ỹ]/.test(correctDef);
      const hasDot = /\.$/.test(correctDef);
      const wordCount = correctDef.split(/\s+/).length;

      const prompt = 'Bạn là chuyên gia biên soạn đề thi tiếng Anh quốc tế (IELTS/SAT Chameleon Distractor Engine).\n' +
        'Từ vựng tiếng Anh: "' + term + '" (' + pos + ').\n' +
        'Định nghĩa đúng tiếng Việt: "' + correctDef + '".\n\n' +
        'NHIỆM VỤ: Hãy tạo chính xác ' + count + ' phương án bẫy SAI HOÀN TOÀN bằng tiếng Việt để làm bài thi trắc nghiệm Quiz.\n\n' +
        'CÁC YÊU CẦU BẮT BUỘC ĐỂ TẠO BẪY ĐỈNH CAO:\n' +
        '1. HOÀN TOÀN SAI VỀ MẶT NGHĨA đối với từ "' + term + '", nhưng phải cực kỳ tinh vi và khó phân biệt (ví dụ: nghĩa của từ đồng âm, từ có tiền tố/hậu tố dễ nhầm, hoặc từ cùng chủ đề nhưng khác biệt về bản chất).\n' +
        '2. MẠO DANH 100% PHONG CÁCH TRÌNH BÀY CỦA ĐÁP ÁN ĐÚNG:\n' +
        '   - Cùng từ loại (' + pos + '), văn phong từ điển chuẩn mực.\n' +
        '   - Độ dài câu xấp xỉ ' + wordCount + ' từ (cấu trúc ngữ pháp tương tự đáp án đúng).\n' +
        '   - ' + (isCap ? 'Viết hoa chữ cái đầu tiên (như đáp án đúng).' : 'Viết thường chữ cái đầu tiên (như đáp án đúng).') + '\n' +
        '   - ' + (hasParens ? 'BẮT BUỘC có phần giải thích sắc thái trong dấu ngoặc đơn (...) tương tự đáp án đúng.' : 'KHÔNG dùng dấu ngoặc đơn.') + '\n' +
        '   - ' + (hasDot ? 'BẮT BUỘC có dấu chấm (.) ở cuối câu.' : 'KHÔNG có dấu chấm ở cuối câu.') + '\n' +
        '3. 100% TIẾNG VIỆT TOÀN DIỆN: TUYỆT ĐỐI KHÔNG CHÈN TỪ TIẾNG ANH (Không ghi tiếng Anh rồi mới mở ngoặc tiếng Việt).\n' +
        '4. ĐỊNH DẠNG TRẢ VỀ: DUY NHẤT một JSON Array chuỗi tiếng Việt chứa đúng ' + count + ' phương án:\n' +
        '[\"phương án bẫy 1\"' + (count > 1 ? ', \"phương án bẫy 2\"' : '') + (count > 2 ? ', \"phương án bẫy 3\"' : '') + ']';

      const cachedWorkingModel = localStorage.getItem('vocaflow_gemini_working_model');
      const standardModels = (typeof GEMINI_STANDARD_MODELS !== 'undefined' && GEMINI_STANDARD_MODELS.length > 0) ? GEMINI_STANDARD_MODELS : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
      const models = (cachedWorkingModel && standardModels.includes(cachedWorkingModel)) ? [cachedWorkingModel, ...standardModels.filter(m => m !== cachedWorkingModel)] : standardModels;

      for (const k of keys) {
        for (const m of models) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4500);

            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + k.trim(), {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: 600,
                  temperature: 0.35,
                  responseMimeType: "application/json"
                },
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
              })
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              if (rawText) {
                rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                let parsed = null;
                try {
                  parsed = JSON.parse(rawText);
                } catch (pe) {
                  const sIdx = rawText.indexOf('[');
                  const eIdx = rawText.lastIndexOf(']');
                  if (sIdx !== -1 && eIdx > sIdx) {
                    try { parsed = JSON.parse(rawText.substring(sIdx, eIdx + 1)); } catch (e) {}
                  }
                }

                let distractorsList = [];
                if (Array.isArray(parsed)) {
                  distractorsList = parsed.map(s => typeof s === 'string' ? s : (s?.text || s?.definition || JSON.stringify(s)));
                } else if (parsed && typeof parsed === 'object') {
                  const arr = parsed.distractors || parsed.options || parsed.traps || parsed.choices || Object.values(parsed).find(v => Array.isArray(v));
                  if (Array.isArray(arr)) {
                    distractorsList = arr.map(s => typeof s === 'string' ? s : (s?.text || s?.definition || JSON.stringify(s)));
                  }
                }

                if (distractorsList.length > 0) {
                  const cleanDistractors = distractorsList
                    .map(s => chameleonStyleMatching((s || '').toString().trim(), correctDef))
                    .filter(s => s.length > 0 && s.toLowerCase() !== correctDef.toLowerCase());

                  if (cleanDistractors.length >= count) {
                    localStorage.setItem('vocaflow_gemini_working_model', m);
                    quizAiDistractorCache[cacheKey] = cleanDistractors.slice(0, count);
                    saveAiDistractorCache();
                    return quizAiDistractorCache[cacheKey];
                  } else if (cleanDistractors.length > 0) {
                    quizAiDistractorCache[cacheKey] = cleanDistractors;
                    saveAiDistractorCache();
                    return cleanDistractors;
                  }
                }
              }
            }
          } catch (err) {
            // Try next model / key on network timeout
          }
        }
      }

      return [];
    }

    function prefetchNextAiDistractors() {
      if (!quizList || quizList.length === 0) return;
      let count = 0;
      if (currentQuizDifficulty === 'extreme') count = 3;
      else if (currentQuizDifficulty === 'hard') count = 2;
      else if (currentQuizDifficulty === 'medium') count = 1;
      if (count <= 0) return;

      [quizIndex + 1, quizIndex + 2, quizIndex + 3].forEach(idx => {
        if (idx < quizList.length) {
          const nextWord = quizList[idx];
          if (nextWord) {
            fetchAiDistractors(nextWord, count).catch(() => {});
          }
        }
      });
    }

    // =========================================================================
    // DETAILED WORD CARD & AI QUIZ EXPLANATION ENGINE (v0.0.10.1g)
    // =========================================================================
    let currentQuizChoices = [];

    function renderWordDetailsCard(prefix, word) {
      const container = document.getElementById(prefix + '-word-details-box');
      if (!container || !word) return;

      const senses = getWordSenses(word);
      const activeSense = word._activeSpellingSense || word._activeQuizSense || senses[0] || word;

      const termEl = document.getElementById(prefix + '-detail-term');
      const posEl = document.getElementById(prefix + '-detail-pos');
      const cefrEl = document.getElementById(prefix + '-detail-cefr');
      const phoneticEl = document.getElementById(prefix + '-detail-phonetic');
      const defEl = document.getElementById(prefix + '-detail-def');
      const exampleEl = document.getElementById(prefix + '-detail-example');
      const metaEl = document.getElementById(prefix + '-detail-meta');

      if (termEl) termEl.textContent = word.term || '';
      
      const pos = activeSense.partOfSpeech || word.partOfSpeech || word.pos || '';
      if (posEl) {
        if (pos) {
          posEl.textContent = String(pos).toUpperCase();
          posEl.style.display = 'inline-block';
        } else {
          posEl.style.display = 'none';
        }
      }

      const cefr = activeSense.cefrLevel || word.cefrLevel || word.level || 'B1';
      if (cefrEl) {
        if (cefr) {
          cefrEl.textContent = String(cefr).toUpperCase();
          cefrEl.style.display = 'inline-block';
        } else {
          cefrEl.style.display = 'none';
        }
      }

      if (phoneticEl) phoneticEl.textContent = activeSense.phonetic || word.phonetic || word.ipa || '';

      if (senses.length > 1) {
        let sensesHtml = `<div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">`;
        senses.forEach((s, idx) => {
          const isCurrent = (s === activeSense) || (s.definitionVi === activeSense.definitionVi);
          sensesHtml += `
            <div style="background: ${isCurrent ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)'}; border: 1px solid ${isCurrent ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)'}; border-radius: 8px; padding: 7px 10px;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px; flex-wrap:wrap;">
                <span class="badge" style="background:#6366f1; color:#fff; font-size:10px; font-weight:700;">Nghĩa #${idx + 1}</span>
                <span class="badge badge-pos" style="font-size:9.5px;">${escapeHtml(s.partOfSpeech || 'noun')}</span>
                <span class="badge badge-level-${(s.cefrLevel || 'b1').toLowerCase()}" style="font-size:9.5px;">${escapeHtml(s.cefrLevel || 'B1')}</span>
                ${s.phonetic ? `<span style="font-family:monospace; color:#38bdf8; font-size:11px;">${escapeHtml(s.phonetic)}</span>` : ''}
                ${isCurrent ? '<span class="badge" style="background:#10b981; color:#fff; font-size:9px; padding:1px 5px;">🎯 Nghĩa Đang Hỏi</span>' : ''}
              </div>
              <div style="font-size:13.5px; font-weight:600; color:var(--text);">${escapeHtml(s.definitionVi || '')}</div>
              ${s.exampleSentence ? `<div style="font-size:12px; font-style:italic; color:var(--text-muted); margin-top:2px;">“${escapeHtml(s.exampleSentence)}”</div>` : ''}
            </div>
          `;
        });
        sensesHtml += `</div>`;
        if (defEl) defEl.innerHTML = sensesHtml;
        if (exampleEl) exampleEl.style.display = 'none';
      } else {
        if (defEl) defEl.textContent = word.definitionVi || word.definition || '';
        const ex = word.exampleSentence || word.example || '';
        if (exampleEl) {
          if (ex) {
            exampleEl.textContent = `“${ex}”`;
            exampleEl.style.display = 'block';
          } else {
            exampleEl.style.display = 'none';
          }
        }
      }

      if (metaEl) {
        const metaParts = [];
        const synList = activeSense.synonyms || word.synonyms;
        if (synList && Array.isArray(synList) && synList.length > 0) {
          metaParts.push(`<strong>Đồng nghĩa:</strong> ${escapeHtml(synList.join(', '))}`);
        }
        const antList = activeSense.antonyms || word.antonyms;
        if (antList && Array.isArray(antList) && antList.length > 0) {
          metaParts.push(`<strong>Trái nghĩa:</strong> ${escapeHtml(antList.join(', '))}`);
        }
        const colList = activeSense.collocations || word.collocations;
        if (colList && Array.isArray(colList) && colList.length > 0) {
          metaParts.push(`<strong>Cụm từ:</strong> ${escapeHtml(colList.join(', '))}`);
        }
        const noteText = activeSense.note || word.note;
        if (noteText && String(noteText).trim()) {
          metaParts.push(`<strong>Ghi chú:</strong> ${escapeHtml(String(noteText).trim())}`);
        }

        if (metaParts.length > 0) {
          metaEl.innerHTML = metaParts.join('<br>');
          metaEl.style.display = 'block';
        } else {
          metaEl.style.display = 'none';
        }
      }

      container.style.display = 'block';
    }

    function formatAiMarkdownText(text) {
      if (!text) return '';
      let str = text.trim();
      // Remove greeting phrases like "Chào bạn, VocaFlow đây!"
      str = str.replace(/^Chào bạn[!,.]?\s*(VocaFlow đây[!,.]?\s*)?/i, '');
      // Bold: **text** or __text__
      str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      str = str.replace(/__(.*?)__/g, '<strong>$1</strong>');
      // Italic: *text* or _text_
      str = str.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
      // Inline code: `code`
      str = str.replace(/`([^`]+)`/g, '<code style="background: rgba(99,102,241,0.25); padding: 1px 5px; border-radius: 4px; font-family: monospace;">$1</code>');
      // Clean extra raw asterisks if any remain
      str = str.replace(/\*\*/g, '');
      // Newlines
      str = str.replace(/\n\s*\n/g, '<br><br>').replace(/\n/g, '<br>');
      return str;
    }

    function generateSmartMnemonicFallback(term, pos, def) {
      const clean = (term || '').toLowerCase().trim();
      let originHint = '';
      if (clean.startsWith('re')) originHint = 'Tiền tố <em>re-</em> (lặp lại, tái lập)';
      else if (clean.startsWith('un') || clean.startsWith('in') || clean.startsWith('im') || clean.startsWith('dis')) originHint = 'Tiền tố mang nghĩa phủ định / nghịch đảo';
      else if (clean.startsWith('trans')) originHint = 'Tiền tố <em>trans-</em> (xuyên qua, chuyển đổi)';
      else if (clean.startsWith('pre')) originHint = 'Tiền tố <em>pre-</em> (trước, báo trước)';
      else if (clean.startsWith('sub')) originHint = 'Tiền tố <em>sub-</em> (dưới, phụ thuộc)';
      else if (clean.startsWith('inter')) originHint = 'Tiền tố <em>inter-</em> (liên kết, giữa các phần tử)';
      else if (clean.startsWith('con') || clean.startsWith('com')) originHint = 'Tiền tố <em>con-/com-</em> (kết hợp, cùng nhau)';
      else if (clean.endsWith('tion') || clean.endsWith('sion')) originHint = 'Hậu tố <em>-tion/-sion</em> tạo danh từ chỉ trạng thái/quá trình';
      else if (clean.endsWith('able') || clean.endsWith('ible')) originHint = 'Hậu tố <em>-able/-ible</em> tạo tính từ chỉ khả năng';
      else if (clean.endsWith('ous')) originHint = 'Hậu tố <em>-ous</em> (chứa đựng, mang bản chất)';
      else if (clean.endsWith('ive')) originHint = 'Hậu tố <em>-ive</em> tạo tính từ chỉ đặc tính / xu hướng';
      else originHint = 'Gốc từ trong hệ ngữ cảnh tiếng Anh học thuật';

      return `<div style="line-height: 1.55;">
        <div style="margin-bottom: 5px;">💡 <strong>Mẹo nhớ:</strong> Gắn liền hình ảnh thực tế của <strong>${escapeHtml(term)}</strong> với ý niệm <em>"${escapeHtml(def)}"</em> để phản xạ tự nhiên.</div>
        <div style="color: #e0e7ff;">🏛️ <strong>Nguồn gốc & Cấu tạo:</strong> ${originHint}.</div>
      </div>`;
    }

    async function loadQuizAiExplanation(questionWord, correctDef, choices) {
      const expBox = document.getElementById('quiz-ai-explanation-box');
      const expText = document.getElementById('quiz-ai-explanation-text');
      if (!expBox || !expText || !questionWord) return;

      expBox.style.display = 'block';

      const term = questionWord.term || '';
      const pos = questionWord.partOfSpeech || questionWord.pos || 'từ vựng';
      const def = correctDef || questionWord.definitionVi || questionWord.definition || '';
      const example = questionWord.exampleSentence || questionWord.example || '';

      // Set initial smart mnemonic & origin breakdown immediately
      expText.innerHTML = generateSmartMnemonicFallback(term, pos, def);

      // If Gemini API is available, fetch live custom mnemonic & etymology
      const key = (typeof geminiApiKey !== 'undefined' && geminiApiKey) ? geminiApiKey : (localStorage.getItem('vocaflow_gemini_api_key') || '');
      const cachedModel = localStorage.getItem('vocaflow_gemini_working_model');
      const standardModels = (typeof GEMINI_STANDARD_MODELS !== 'undefined' && GEMINI_STANDARD_MODELS.length > 0) ? GEMINI_STANDARD_MODELS : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
      const modelsToTry = (cachedModel && standardModels.includes(cachedModel)) ? [cachedModel, ...standardModels.filter(m => m !== cachedModel)] : standardModels;

      if (key && key.trim()) {
        const prompt = `Từ vựng tiếng Anh: "${term}" (${pos}).
Định nghĩa: "${def}".
${example ? `Ví dụ: "${example}"` : ''}

Nhiệm vụ: Hãy viết nhận xét ngắn gọn (khoảng 35-45 từ, bằng tiếng Việt) tập trung DUY NHẤT vào:
1. 💡 Mẹo ghi nhớ: (liên tưởng âm thanh tương tự, hình ảnh hoặc mẹo nhớ siêu tốc).
2. 🏛️ Nguồn gốc: (etymology, tiền tố/hậu tố, gốc Latinh/Hy Lạp hoặc cấu tạo từ).

Yêu cầu nghiêm ngặt:
- Tuyệt đối không chào hỏi (không có "Chào bạn", "VocaFlow đây").
- Không lặp lại định nghĩa.
- Định dạng rõ ràng:
💡 Mẹo nhớ: [nội dung]
🏛️ Nguồn gốc: [nội dung]`;

        for (const m of modelsToTry) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4500);

            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + key.trim(), {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 120, temperature: 0.3 }
              })
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              const rawExp = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (rawExp) {
                const formatted = formatAiMarkdownText(rawExp);
                expText.innerHTML = `<div style="line-height: 1.55; color: #fdf4ff;">${formatted}</div>`;
                break;
              }
            }
          } catch (e) {
            console.warn('AI Quiz Explanation notice for model ' + m + ':', e);
          }
        }
      }
    }

    // =========================================================================
    // MISTAKE NOTEBOOK ENGINE & PERSISTENT WRONG ANSWERS TRACKER (v0.10.9-37)
    // =========================================================================
    const STORAGE_KEY_MISTAKE_NOTEBOOK = 'vocaflow_mistake_notebook_v1';
    let quizSessionWrongWords = [];
    let spellingSessionWrongWords = [];
    let speakingSessionWrongWords = [];
    let currentMistakeSearchQuery = '';
    let currentMistakeDeckFilter = 'all';
    let currentMistakeModeFilter = 'all';

    function getMistakeWordsList() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_MISTAKE_NOTEBOOK);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn('Error reading mistake notebook:', e);
        return [];
      }
    }

    function saveMistakeWordsList(list) {
      try {
        localStorage.setItem(STORAGE_KEY_MISTAKE_NOTEBOOK, JSON.stringify(Array.isArray(list) ? list : []));
        updateMistakeBadgeUI();
      } catch (e) {
        console.warn('Error saving mistake notebook:', e);
      }
    }

    function addWordToMistakeList(word, mode = 'quiz') {
      if (!word || (!word.id && !word.term)) return;
      try {
        const list = getMistakeWordsList();
        const wordId = word.id || ('w_' + encodeURIComponent(word.term).replace(/%/g, '_'));
        const termClean = (word.term || '').trim();
        const existingIdx = list.findIndex(item => (item.wordId && item.wordId === wordId) || (item.term && item.term.toLowerCase() === termClean.toLowerCase()));

        const now = Date.now();
        const phoneticVal = word.phonetic || (word._activeQuizSense && word._activeQuizSense.phonetic) || (word._activeSpellingSense && word._activeSpellingSense.phonetic) || '';
        const defViVal = word.definitionVi || word.definition || (word._activeQuizSense && (word._activeQuizSense.definitionVi || word._activeQuizSense.definition)) || (word._activeSpellingSense && (word._activeSpellingSense.definitionVi || word._activeSpellingSense.definition)) || '';
        const defVal = word.definition || word.definitionVi || (word._activeQuizSense && (word._activeQuizSense.definition || word._activeQuizSense.definitionVi)) || (word._activeSpellingSense && (word._activeSpellingSense.definition || word._activeSpellingSense.definitionVi)) || '';
        const cefrVal = word.cefrLevel || word.level || 'B1';
        const posVal = word.partOfSpeech || 'noun';
        const exVal = word.exampleSentence || word.example || '';
        const deckVal = word.deckId || currentDeckId || '';

        if (existingIdx >= 0) {
          const item = list[existingIdx];
          item.mistakeCount = (parseInt(item.mistakeCount, 10) || 1) + 1;
          item.lastMistakeMode = mode;
          item.lastMistakeAt = now;
          if (!item.phonetic && phoneticVal) item.phonetic = phoneticVal;
          if (!item.definitionVi && defViVal) item.definitionVi = defViVal;
          if (!item.definition && defVal) item.definition = defVal;
          if (!Array.isArray(item.modesFailed)) item.modesFailed = [item.lastMistakeMode || mode];
          if (!item.modesFailed.includes(mode)) item.modesFailed.push(mode);
          // Move to top of the list
          list.splice(existingIdx, 1);
          list.unshift(item);
        } else {
          const newItem = {
            wordId: wordId,
            term: termClean,
            phonetic: phoneticVal,
            definitionVi: defViVal,
            definition: defVal,
            partOfSpeech: posVal,
            cefrLevel: cefrVal,
            exampleSentence: exVal,
            deckId: deckVal,
            mistakeCount: 1,
            lastMistakeMode: mode,
            modesFailed: [mode],
            lastMistakeAt: now
          };
          list.unshift(newItem);
        }
        saveMistakeWordsList(list);
      } catch (e) {
        console.warn('Error adding word to mistake list:', e);
      }
    }

    function removeWordFromMistakeList(wordOrIdOrTerm, forceRemove = false) {
      if (!wordOrIdOrTerm) return;
      try {
        const list = getMistakeWordsList();
        const targetStr = (typeof wordOrIdOrTerm === 'object') 
          ? String(wordOrIdOrTerm.id || wordOrIdOrTerm.term || '').trim().toLowerCase()
          : String(wordOrIdOrTerm).trim().toLowerCase();
        const targetTerm = (typeof wordOrIdOrTerm === 'object' && wordOrIdOrTerm.term)
          ? String(wordOrIdOrTerm.term).trim().toLowerCase()
          : targetStr;

        const idx = list.findIndex(item => {
          const idMatch = item.wordId && (String(item.wordId).toLowerCase() === targetStr || String(item.wordId).toLowerCase() === targetTerm);
          const termMatch = item.term && (item.term.toLowerCase() === targetStr || item.term.toLowerCase() === targetTerm);
          return idMatch || termMatch;
        });

        if (idx >= 0) {
          const item = list[idx];
          if (forceRemove) {
            list.splice(idx, 1);
            saveMistakeWordsList(list);
          } else {
            // "sai bao nhiêu lần thì phải làm bù đúng bấy nhiêu lần"
            const currentCount = parseInt(item.mistakeCount, 10) || 1;
            const newCount = currentCount - 1;
            if (newCount <= 0) {
              list.splice(idx, 1);
              saveMistakeWordsList(list);
              showToast(`🎉 Tuyệt vời! Đã hoàn toàn khắc phục lỗi sai từ: "${item.term}"!`);
            } else {
              item.mistakeCount = newCount;
              list[idx] = item;
              saveMistakeWordsList(list);
              showToast(`✨ Làm đúng từ "${item.term}"! (Còn ${newCount} lần làm đúng nữa để gỡ khỏi Sổ Tay Lỗi Sai)`);
            }
          }
        }
      } catch (e) {
        console.warn('Error updating word in mistake list:', e);
      }
    }

    function clearAllMistakeWords() {
      const list = getMistakeWordsList();
      if (!list || list.length === 0) {
        showToast('ℹ️ Sổ Tay Lỗi Sai hiện đang trống!');
        return;
      }
      if (confirm('🗑️ Bạn có chắc chắn muốn xóa toàn bộ ' + list.length + ' từ trong Sổ Tay Lỗi Sai không?')) {
        saveMistakeWordsList([]);
        renderMistakeNotebookList();
        showToast('🗑️ Đã xóa sạch toàn bộ Sổ Tay Lỗi Sai!');
      }
    }

    function updateMistakeBadgeUI() {
      try {
        const list = getMistakeWordsList();
        const totalCount = list.length;

        // 1. Header Badge
        const headerBadge = document.getElementById('header-mistake-count');
        if (headerBadge) {
          if (totalCount > 0) {
            headerBadge.style.display = 'flex';
            headerBadge.textContent = totalCount > 99 ? '99+' : totalCount;
          } else {
            headerBadge.style.display = 'none';
          }
        }

        // 2. Deck Detail Badge
        const deckMistakeLabel = document.getElementById('deck-mistake-count-label');
        if (deckMistakeLabel) {
          if (currentDeckId) {
            const deckMistakes = list.filter(item => item.deckId === currentDeckId);
            if (deckMistakes.length > 0) {
              deckMistakeLabel.style.display = 'inline-block';
              deckMistakeLabel.textContent = deckMistakes.length;
            } else {
              deckMistakeLabel.style.display = 'none';
            }
          } else {
            deckMistakeLabel.style.display = 'none';
          }
        }

        // 3. Modal Header Count Badge
        const modalCountBadge = document.getElementById('mistake-notebook-count-badge');
        if (modalCountBadge) {
          modalCountBadge.textContent = totalCount + ' từ';
        }
      } catch (e) {
        console.warn('Error updating mistake badge UI:', e);
      }
    }

    function openMistakeNotebookModal(deckIdFilter = null) {
      // Populate Deck filter dropdown
      const deckSelect = document.getElementById('mistake-notebook-deck-filter');
      if (deckSelect) {
        let optHtml = '<option value="all">📁 Tất cả VocaDeck</option>';
        if (Array.isArray(decks)) {
          decks.forEach(d => {
            optHtml += '<option value="' + escapeHtml(d.id) + '">' + escapeHtml(d.title) + '</option>';
          });
        }
        deckSelect.innerHTML = optHtml;
        if (deckIdFilter && Array.isArray(decks) && decks.some(d => d.id === deckIdFilter)) {
          deckSelect.value = deckIdFilter;
          currentMistakeDeckFilter = deckIdFilter;
        } else {
          deckSelect.value = 'all';
          currentMistakeDeckFilter = 'all';
        }
      }

      const searchInp = document.getElementById('mistake-notebook-search');
      if (searchInp) {
        searchInp.value = '';
        currentMistakeSearchQuery = '';
      }

      const modeSelect = document.getElementById('mistake-notebook-mode-filter');
      if (modeSelect) {
        modeSelect.value = 'all';
        currentMistakeModeFilter = 'all';
      }

      renderMistakeNotebookList();
      openModal('modal-mistake-notebook');
    }

    function onMistakeNotebookSearch(query) {
      currentMistakeSearchQuery = (query || '').trim().toLowerCase();
      renderMistakeNotebookList();
    }

    function onMistakeNotebookDeckFilterChange(deckId) {
      currentMistakeDeckFilter = deckId || 'all';
      renderMistakeNotebookList();
    }

    function onMistakeNotebookModeFilterChange(mode) {
      currentMistakeModeFilter = mode || 'all';
      renderMistakeNotebookList();
    }

    function getFilteredMistakeList() {
      const fullList = getMistakeWordsList();
      return fullList.filter(item => {
        // 1. Search Query
        if (currentMistakeSearchQuery) {
          const t = (item.term || '').toLowerCase();
          const defVi = (item.definitionVi || '').toLowerCase();
          const def = (item.definition || '').toLowerCase();
          if (!t.includes(currentMistakeSearchQuery) && !defVi.includes(currentMistakeSearchQuery) && !def.includes(currentMistakeSearchQuery)) {
            return false;
          }
        }
        // 2. Deck Filter
        if (currentMistakeDeckFilter && currentMistakeDeckFilter !== 'all') {
          if (item.deckId !== currentMistakeDeckFilter) return false;
        }
        // 3. Mode Filter
        if (currentMistakeModeFilter && currentMistakeModeFilter !== 'all') {
          const inModes = Array.isArray(item.modesFailed) ? item.modesFailed.includes(currentMistakeModeFilter) : false;
          const lastMatch = item.lastMistakeMode === currentMistakeModeFilter;
          if (!inModes && !lastMatch) return false;
        }
        return true;
      });
    }

    function renderMistakeNotebookList() {
      const container = document.getElementById('mistake-notebook-list-container');
      if (!container) return;

      const filtered = getFilteredMistakeList();
      const countBadge = document.getElementById('mistake-notebook-count-badge');
      if (countBadge) countBadge.textContent = filtered.length + ' từ';

      // Update Action Button labels & states
      const btnQuiz = document.getElementById('btn-mistake-quiz');
      const labelQuiz = document.getElementById('label-mistake-quiz');
      const btnSpelling = document.getElementById('btn-mistake-spelling');
      const labelSpelling = document.getElementById('label-mistake-spelling');
      const btnSpeaking = document.getElementById('btn-mistake-speaking');
      const labelSpeaking = document.getElementById('label-mistake-speaking');

      if (labelQuiz) labelQuiz.textContent = '🎯 Ôn Trắc Nghiệm (' + filtered.length + ')';
      if (labelSpelling) labelSpelling.textContent = '✍️ Luyện Viết (' + filtered.length + ')';
      if (labelSpeaking) labelSpeaking.textContent = '🎙️ Luyện Nói (' + filtered.length + ')';

      if (btnQuiz) btnQuiz.disabled = (filtered.length < 2);
      if (btnSpelling) btnSpelling.disabled = (filtered.length < 1);
      if (btnSpeaking) btnSpeaking.disabled = (filtered.length < 1);

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 48px 16px; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed var(--border);">
            <div style="font-size: 46px; margin-bottom: 8px;">🎉</div>
            <strong style="font-size: 15px; color: var(--text); display: block; margin-bottom: 4px;">Sổ Tay Lỗi Sai Đang Trống!</strong>
            <p style="font-size: 12px; margin: 0; color: var(--text-muted);">
              ${currentMistakeSearchQuery || currentMistakeDeckFilter !== 'all' || currentMistakeModeFilter !== 'all' 
                ? 'Không tìm thấy từ vựng nào khớp với bộ lọc hiện tại.' 
                : 'Bạn chưa làm sai từ vựng nào hoặc đã thuộc hết toàn bộ các câu sai! Hãy tiếp tục phát huy nhé.'}
            </p>
          </div>
        `;
        return;
      }

      let html = '';
      filtered.forEach(item => {
        const deckObj = Array.isArray(decks) ? decks.find(d => d.id === item.deckId) : null;
        const deckName = deckObj ? deckObj.title : 'VocaDeck';
        const mistakeCount = item.mistakeCount || 1;
        const cefrLevel = (item.cefrLevel || 'B1').toUpperCase();
        const pos = (item.partOfSpeech || 'noun').toLowerCase();
        const phonetic = item.phonetic ? '[' + item.phonetic + ']' : '';
        const def = item.definitionVi || item.definition || '';

        const modeBadges = (Array.isArray(item.modesFailed) && item.modesFailed.length > 0) ? item.modesFailed : [item.lastMistakeMode || 'quiz'];
        let modesHtml = '';
        modeBadges.forEach(m => {
          if (m === 'quiz') modesHtml += '<span class="badge" style="background: rgba(99,102,241,0.15); color: #818cf8; font-size: 10px;">🎯 Quiz</span> ';
          if (m === 'spelling') modesHtml += '<span class="badge" style="background: rgba(245,158,11,0.15); color: #fbbf24; font-size: 10px;">✍️ Viết</span> ';
          if (m === 'speaking') modesHtml += '<span class="badge" style="background: rgba(236,72,153,0.15); color: #f472b6; font-size: 10px;">🎙️ Nói</span> ';
        });

        const timeStr = item.lastMistakeAt ? formatDateOnly(item.lastMistakeAt) : '';

        html += `
          <div class="mistake-item-card" style="background: var(--surface-elevated, #1e293b); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: border-color 0.2s;">
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                <strong style="font-size: 15px; color: var(--text);">${escapeHtml(item.term)}</strong>
                ${phonetic ? `<span style="font-size: 12px; color: #a5b4fc; font-family: monospace;">${escapeHtml(phonetic)}</span>` : ''}
                <span class="badge badge-level-${cefrLevel.toLowerCase()}" style="font-size: 10px; padding: 1px 6px;">${cefrLevel}</span>
                <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">(${pos})</span>
                <span class="badge" style="background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); font-size: 10.5px; font-weight: 700; padding: 1px 6px;">❌ Sai ${mistakeCount} lần</span>
              </div>
              
              <div style="font-size: 13px; color: var(--text); margin-bottom: 4px; line-height: 1.4;">
                ${escapeHtml(def)}
              </div>

              <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted); flex-wrap: wrap;">
                <span style="display: inline-flex; align-items: center; gap: 3px;">📁 <strong style="color: var(--text);">${escapeHtml(deckName)}</strong></span>
                <span>•</span>
                <span style="display: inline-flex; align-items: center; gap: 4px;">Chế độ: ${modesHtml}</span>
                ${timeStr ? `<span>•</span> <span>🕒 ${timeStr}</span>` : ''}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              <button class="btn btn-outline btn-icon btn-sm" onclick="speakText('${escapeHtml(item.term)}')" title="Nghe phát âm chuẩn" style="border-radius: 8px;">
                <svg class="icon icon-sm"><use href="#i-volume"/></svg>
              </button>
              <button class="btn btn-outline btn-sm" onclick="startSingleMistakeReview('${escapeHtml(item.wordId || item.term)}')" title="Luyện tập riêng từ này ngay" style="padding: 4px 8px; font-size: 11px; color: #818cf8; border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.08);">
                🎯 Ôn từ này
              </button>
              <button class="btn btn-outline btn-icon btn-sm" onclick="removeWordFromMistakeListAndRender('${escapeHtml(item.wordId || item.term)}')" title="Xóa khỏi sổ tay lỗi sai" style="color: #f87171; border-color: rgba(239,68,68,0.3); border-radius: 8px;">
                <svg class="icon icon-sm" style="fill: var(--danger);"><use href="#i-delete"/></svg>
              </button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }

    function removeWordFromMistakeListAndRender(wordIdOrTerm) {
      removeWordFromMistakeList(wordIdOrTerm, true);
      renderMistakeNotebookList();
      showToast('🗑️ Đã xóa từ khỏi Sổ Tay Lỗi Sai!');
    }

    function resolveMistakeWordsToAppWords(mistakeItems) {
      if (!Array.isArray(mistakeItems)) return [];
      return mistakeItems.map(item => {
        const foundInWords = Array.isArray(words) ? words.find(w => (w.id && item.wordId && w.id === item.wordId) || (w.term && item.term && w.term.toLowerCase() === item.term.toLowerCase())) : null;
        if (foundInWords) return foundInWords;
        // Synthesize compatible word object
        return {
          id: item.wordId || ('w_synth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
          term: item.term,
          phonetic: item.phonetic || '',
          definitionVi: item.definitionVi || item.definition || '',
          definition: item.definition || item.definitionVi || '',
          partOfSpeech: item.partOfSpeech || 'noun',
          cefrLevel: item.cefrLevel || 'B1',
          level: item.cefrLevel || 'B1',
          exampleSentence: item.exampleSentence || '',
          example: item.exampleSentence || '',
          deckId: item.deckId || currentDeckId || '',
          masteryScore: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
    }

    function startMistakeReviewSession(mode = 'quiz') {
      const filtered = getFilteredMistakeList();
      if (filtered.length === 0) {
        showToast('ℹ️ Không có từ nào trong danh sách hiện tại để ôn tập!');
        return;
      }

      if (mode === 'quiz' && filtered.length < 2) {
        showToast('⚠️ Bài trắc nghiệm Quiz cần tối thiểu 2 từ vựng!');
        return;
      }

      const reviewWords = resolveMistakeWordsToAppWords(filtered);
      closeModal('modal-mistake-notebook');

      if (mode === 'quiz') {
        startQuizMode(false, reviewWords);
      } else if (mode === 'spelling') {
        startSpellingMode(false, reviewWords);
      } else if (mode === 'speaking') {
        startSpeakingMode(false, reviewWords);
      }
    }

    function startSingleMistakeReview(wordIdOrTerm) {
      const list = getMistakeWordsList();
      const item = list.find(w => (w.wordId && w.wordId === wordIdOrTerm) || (w.term && w.term.toLowerCase() === String(wordIdOrTerm).toLowerCase()));
      if (!item) return;

      const resolved = resolveMistakeWordsToAppWords([item]);
      closeModal('modal-mistake-notebook');
      startSpellingMode(false, resolved);
    }

    function retryQuizWrongWordsOnly() {
      if (!quizSessionWrongWords || quizSessionWrongWords.length === 0) {
        showToast('🎉 Không có câu sai nào trong bài!');
        return;
      }
      closeModal('modal-quiz-result');
      const wordsToRetry = [...quizSessionWrongWords];
      startQuizMode(false, wordsToRetry);
    }

    function retrySpellingWrongWordsOnly() {
      if (!spellingSessionWrongWords || spellingSessionWrongWords.length === 0) {
        showToast('🎉 Không có từ sai nào trong bài!');
        return;
      }
      closeModal('modal-spelling-result');
      const wordsToRetry = [...spellingSessionWrongWords];
      startSpellingMode(false, wordsToRetry);
    }

    function retrySpeakingWrongWordsOnly() {
      if (!speakingSessionWrongWords || speakingSessionWrongWords.length === 0) {
        showToast('🎉 Tất cả các từ đã đạt điểm sàn phát âm!');
        return;
      }
      closeSpeakingResultModal();
      const wordsToRetry = [...speakingSessionWrongWords];
      startSpeakingMode(false, wordsToRetry);
    }

    function startQuizMode(useSelectionOnly = false, customWordList = null) {
      dismissMiniAutoFlashcardIfActive();
      studySourceContext = customWordList ? 'review-queue' : 'deck';
      quizSessionWrongWords = [];
      let deckWords = customWordList || getFilteredDeckWords();
      if (!customWordList && useSelectionOnly && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      } else if (!customWordList && selectedWordIds.size > 0) {
        deckWords = words.filter(w => selectedWordIds.has(w.id));
      }

      if (deckWords.length < 2) {
        alert('Cần tối thiểu 2 từ vựng để tạo bài trắc nghiệm Quiz!');
        return;
      }

      if (isStudyShuffle) {
        quizList = [...deckWords].sort(() => Math.random() - 0.5);
      } else {
        quizList = [...deckWords];
      }
      quizIndex = 0;
      quizScore = 0;
      quizIsAnswered = false;
      quizIsCompleted = false;

      // Track statistics for result modal
      quizStartTime = Date.now();
      quizActiveTimeMs = 0;
      quizQuestionStartTime = null;
      quizCorrectCount = 0;
      quizWrongCount = 0;
      quizPointsEarned = 0;
      quizHintsUsed = 0;
      quizSkipCount = 0;
      quizTotalQuestions = quizList.length;

      loadQuizQuestion();
      showScreen('screen-quiz');
    }

    function shuffleCurrentQuiz() {
      if (!quizList || quizList.length <= 1) return;
      const remainingCount = quizList.length - 1 - quizIndex;
      if (remainingCount <= 0) {
        showToast('ℹ️ Bạn đang ở câu cuối cùng, không còn câu hỏi phía sau để xáo trộn!');
        return;
      }
      if (remainingCount === 1) {
        showToast('ℹ️ Chỉ còn 1 câu hỏi phía sau, không thể xáo trộn thêm!');
        return;
      }
      for (let i = quizList.length - 1; i > quizIndex + 1; i--) {
        const j = quizIndex + 1 + Math.floor(Math.random() * (i - quizIndex));
        [quizList[i], quizList[j]] = [quizList[j], quizList[i]];
      }
      showToast(`🔀 Đã xáo trộn ${remainingCount} câu hỏi còn lại phía sau!`);
    }

    function generateSmartDistractors(questionWord, countNeeded = 3, existingDistractors = []) {
      const activeSense = questionWord._activeQuizSense || getWordSenses(questionWord)[0] || questionWord;
      const correctDef = (activeSense.definitionVi || activeSense.definition || questionWord.definitionVi || questionWord.definition || '').trim();
      const currentPos = (activeSense.partOfSpeech || questionWord.partOfSpeech || 'noun').toLowerCase().trim();
      const currentDeckId = questionWord.deckId;

      const chosenDefs = new Set(existingDistractors.map(d => (d || '').trim().toLowerCase()));
      chosenDefs.add(correctDef.toLowerCase());

      // Polysemy / Homographs: Add ALL senses of questionWord AND any word sharing same term to chosenDefs
      // Distractors MUST NEVER include any definition of any sense of this same word!
      const qTerm = (questionWord.term || '').trim().toLowerCase();
      getWordSenses(questionWord).forEach(s => {
        const d = (s.definitionVi || s.definition || '').trim().toLowerCase();
        if (d) chosenDefs.add(d);
      });
      words.forEach(w => {
        if ((w.term || '').trim().toLowerCase() === qTerm) {
          getWordSenses(w).forEach(s => {
            const d = (s.definitionVi || s.definition || '').trim().toLowerCase();
            if (d) chosenDefs.add(d);
          });
        }
      });

      const otherWords = words.filter(w => {
        const sameTerm = (w.term || '').trim().toLowerCase() === qTerm;
        const d = (w.definitionVi || w.definition || '').trim().toLowerCase();
        return w.id !== questionWord.id && !sameTerm && d && !chosenDefs.has(d);
      });

      const resultList = [];

      // 1. Priority 1: Same Part of Speech + Same Deck
      const samePosSameDeck = otherWords.filter(w => (w.partOfSpeech || 'noun').toLowerCase().trim() === currentPos && w.deckId === currentDeckId);
      samePosSameDeck.sort(() => Math.random() - 0.5).forEach(w => {
        const d = (w.definitionVi || w.definition || '').trim();
        if (resultList.length < countNeeded && !chosenDefs.has(d.toLowerCase())) {
          chosenDefs.add(d.toLowerCase());
          resultList.push(d);
        }
      });

      // 2. Priority 2: Same Part of Speech + Other Decks
      if (resultList.length < countNeeded) {
        const samePosOtherDecks = otherWords.filter(w => (w.partOfSpeech || 'noun').toLowerCase().trim() === currentPos && !chosenDefs.has((w.definitionVi || w.definition || '').trim().toLowerCase()));
        samePosOtherDecks.sort(() => Math.random() - 0.5).forEach(w => {
          const d = (w.definitionVi || w.definition || '').trim();
          if (resultList.length < countNeeded && !chosenDefs.has(d.toLowerCase())) {
            chosenDefs.add(d.toLowerCase());
            resultList.push(d);
          }
        });
      }

      // 3. Priority 3: Same Deck (Any POS)
      if (resultList.length < countNeeded) {
        const sameDeckAnyPos = otherWords.filter(w => w.deckId === currentDeckId && !chosenDefs.has((w.definitionVi || w.definition || '').trim().toLowerCase()));
        sameDeckAnyPos.sort(() => Math.random() - 0.5).forEach(w => {
          const d = (w.definitionVi || w.definition || '').trim();
          if (resultList.length < countNeeded && !chosenDefs.has(d.toLowerCase())) {
            chosenDefs.add(d.toLowerCase());
            resultList.push(d);
          }
        });
      }

      // 4. Priority 4: Any other word across the app
      if (resultList.length < countNeeded) {
        const remainingWords = otherWords.filter(w => !chosenDefs.has((w.definitionVi || w.definition || '').trim().toLowerCase()));
        remainingWords.sort(() => Math.random() - 0.5).forEach(w => {
          const d = (w.definitionVi || w.definition || '').trim();
          if (resultList.length < countNeeded && !chosenDefs.has(d.toLowerCase())) {
            chosenDefs.add(d.toLowerCase());
            resultList.push(d);
          }
        });
      }

      // 5. Priority 5: High-Quality Category / POS Fallback Pool
      if (resultList.length < countNeeded) {
        const posFallbackPools = {
          noun: [
            'Sự chuyển hóa và biến đổi cấu trúc phân tử',
            'Hiện tượng khuếch tán và dẫn truyền năng lượng',
            'Quá trình phân tách các thành phần trong hỗn hợp',
            'Quy luật bảo toàn và trạng thái cân bằng động',
            'Phương pháp định lượng và đo lường thực nghiệm',
            'Chỉ số biểu thị nồng độ hoặc hiệu suất phản ứng',
            'Cơ chế tác động và kiểm soát phản hồi sinh học',
            'Nguyên lý tương tác giữa các yếu tố trong hệ thống'
          ],
          verb: [
            'Duy trì trạng thái cân bằng trong hệ thống',
            'Tiến hành phân tích và đo lường nồng độ',
            'Kích hoạt quá trình biến đổi và trao đổi chất',
            'Làm suy giảm tốc độ hoặc kìm hãm phản ứng',
            'Thiết lập mối tương quan giữa các thông số',
            'Thúc đẩy quá trình tái tạo và phát triển',
            'Điều chỉnh thông số cho phù hợp với tiêu chuẩn'
          ],
          adjective: [
            'Có khả năng thích ứng và phản ứng nhanh',
            'Đặc trưng bởi tính ổn định và tính liên tục',
            'Tương thích với các điều kiện môi trường xung quanh',
            'Đóng vai trò chủ đạo và mang tính quyết định',
            'Dễ bị phân hủy dưới tác động ngoại cảnh',
            'Có xu hướng tích lũy và gia tăng theo thời gian'
          ],
          adverb: [
            'Một cách tuần tự và có hệ thống rõ ràng',
            'Tương đối đồng đều trên toàn bộ bề mặt',
            'Đột ngột và không thể dự đoán trước',
            'Một cách triệt để và toàn diện nhất'
          ],
          phrase: [
            'Dẫn đến sự thay đổi rõ rệt về cấu trúc',
            'Đóng vai trò trung gian trong toàn bộ chu trình',
            'Phụ thuộc mật thiết vào điều kiện ban đầu'
          ]
        };

        const fallbackList = posFallbackPools[currentPos] || posFallbackPools.noun;
        const shuffledFallbacks = [...fallbackList].sort(() => Math.random() - 0.5);
        shuffledFallbacks.forEach(fb => {
          if (resultList.length < countNeeded && fb.toLowerCase() !== correctDef.toLowerCase() && !chosenDefs.has(fb.toLowerCase())) {
            chosenDefs.add(fb.toLowerCase());
            resultList.push(fb);
          }
        });
      }

      return resultList;
    }

    async function loadQuizQuestion() {
      quizIsAnswered = false;
      quizQuestionStartTime = Date.now();
      const quizNextCont = document.getElementById('quiz-next-container');
      if (quizNextCont) {
        quizNextCont.style.display = 'none';
        const qNextBtn = quizNextCont.querySelector('button');
        if (qNextBtn) {
          qNextBtn.className = 'btn btn-primary';
          qNextBtn.style.background = '';
          qNextBtn.style.boxShadow = '';
          qNextBtn.innerHTML = '<span>Câu tiếp theo</span> <kbd class="key-shortcut-badge">Enter ↵</kbd>';
        }
      }
      const hintBox = document.getElementById('quiz-hint-box');
      if (hintBox) hintBox.style.display = 'none';

      const questionWord = quizList[quizIndex];
      const total = quizList.length;

      // Polysemy / Homographs: Pick random sense to quiz
      const senses = getWordSenses(questionWord);
      const chosenSense = (senses && senses.length > 0) ? senses[Math.floor(Math.random() * senses.length)] : questionWord;
      questionWord._activeQuizSense = chosenSense;
      const senseIdx = senses.indexOf(chosenSense);

      document.getElementById('quiz-counter').textContent = 'Câu ' + (quizIndex + 1) + ' / ' + total;
      document.getElementById('quiz-score').textContent = 'Bài: ' + (quizScore >= 0 ? '+' : '') + quizScore + 'đ';
      document.getElementById('quiz-question-term').textContent = questionWord.term;
      
      const phoneticText = chosenSense.phonetic || questionWord.phonetic || '';
      const phoneticEl = document.getElementById('quiz-question-phonetic');
      if (phoneticEl) {
        const badge = (senses.length > 1) ? ` <span class="badge" style="background: rgba(99,102,241,0.2); color: #818cf8; font-size: 10px; vertical-align: middle;">📚 Nghĩa ${senseIdx + 1}/${senses.length}</span>` : '';
        phoneticEl.innerHTML = (phoneticText ? escapeHtml(phoneticText) : '') + badge;
      }

      updateQuizDifficultyUI();

      // Determine AI distractor count based on difficulty
      let aiDistractorCount = 0;
      if (currentQuizDifficulty === 'extreme') aiDistractorCount = 3;
      else if (currentQuizDifficulty === 'hard') aiDistractorCount = 2;
      else if (currentQuizDifficulty === 'medium') aiDistractorCount = 1;

      let aiDistractors = [];
      if (aiDistractorCount > 0) {
        try {
          const fetchPromise = fetchAiDistractors(questionWord, aiDistractorCount);
          const timeoutPromise = new Promise(res => setTimeout(() => res([]), 1200));
          aiDistractors = await Promise.race([fetchPromise, timeoutPromise]);
          if (!Array.isArray(aiDistractors)) aiDistractors = [];
        } catch (e) {
          aiDistractors = [];
        }
      }

      const correctDef = (chosenSense.definitionVi || chosenSense.definition || questionWord.definitionVi || questionWord.definition || '').trim();

      // Collect all forbidden definitions for distractors (all senses of question word)
      const forbiddenDefs = new Set();
      senses.forEach(s => {
        const d = (s.definitionVi || s.definition || '').trim().toLowerCase();
        if (d) forbiddenDefs.add(d);
      });
      const qTerm = (questionWord.term || '').trim().toLowerCase();
      words.forEach(w => {
        if ((w.term || '').trim().toLowerCase() === qTerm) {
          getWordSenses(w).forEach(s => {
            const d = (s.definitionVi || s.definition || '').trim().toLowerCase();
            if (d) forbiddenDefs.add(d);
          });
        }
      });

      // Strict filter: AI distractors MUST NOT match ANY sense of the target word
      aiDistractors = aiDistractors.filter(d => d && !forbiddenDefs.has(d.trim().toLowerCase()));

      const regularNeeded = 3 - aiDistractors.length;
      const rawRegularDistractors = generateSmartDistractors(questionWord, regularNeeded, aiDistractors);
      const regularDistractors = rawRegularDistractors.map(d => chameleonStyleMatching(d, correctDef));
      const choices = [correctDef, ...aiDistractors, ...regularDistractors].slice(0, 4).sort(() => Math.random() - 0.5);
      currentQuizChoices = choices;

      const detailsBox = document.getElementById('quiz-word-details-box');
      if (detailsBox) detailsBox.style.display = 'none';

      const optionsContainer = document.getElementById('quiz-options-container');
      optionsContainer.innerHTML = '';

      choices.forEach((choice, idx) => {
        const opt = document.createElement('button');
        opt.className = 'quiz-option';
        opt.style.display = 'flex';
        opt.style.alignItems = 'center';
        opt.style.gap = '10px';
        opt.style.textAlign = 'left';

        const keyNum = idx + 1;
        const keyBadge = `<span class="quiz-key-badge">${keyNum}</span>`;
        opt.innerHTML = `${keyBadge} <span class="quiz-opt-text" style="flex: 1;">${escapeHtml(choice)}</span>`;
        opt.onclick = () => checkQuizAnswer(opt, choice === correctDef);
        optionsContainer.appendChild(opt);
      });

      // Background prefetch next questions for zero-latency quiz progression
      prefetchNextAiDistractors();

      setTimeout(() => {
        speakQuizTerm();
      }, 150);
    }

    function getQuizScoringDeltas(difficulty, isCorrect) {
      const diff = difficulty || currentQuizDifficulty || 'easy';
      if (isCorrect) {
        if (diff === 'extreme') return { masteryGain: 9, walletDelta: 9 };
        if (diff === 'hard') return { masteryGain: 7, walletDelta: 7 };
        if (diff === 'medium') return { masteryGain: 5, walletDelta: 5 };
        return { masteryGain: 3, walletDelta: 3 }; // easy
      } else {
        if (diff === 'extreme') return { masteryPenalty: 5, walletDelta: -5 };
        if (diff === 'hard') return { masteryPenalty: 4, walletDelta: -4 };
        if (diff === 'medium') return { masteryPenalty: 3, walletDelta: -3 };
        return { masteryPenalty: 2, walletDelta: -2 }; // easy
      }
    }

    function getQuizPointDelta(cefrLevel, isCorrect) {
      const { walletDelta } = getQuizScoringDeltas(currentQuizDifficulty, isCorrect);
      return walletDelta;
    }

    async function showQuizAiHint() {
      if (!quizList || quizList.length === 0 || quizIndex >= quizList.length) return;
      const questionWord = quizList[quizIndex];
      if (!questionWord) return;

      const hintBox = document.getElementById('quiz-hint-box');
      const hintText = document.getElementById('quiz-hint-text');
      if (!hintBox || !hintText) return;

      if (hintBox.style.display === 'block') {
        hintBox.style.display = 'none';
        return;
      }

      quizHintsUsed++;

      // 1. RULE: Only logged in users can use Hints
      if (!currentUser || !currentUser.email) {
        alert('🔒 Tính năng VocaHint chỉ dành cho thành viên đã đăng nhập/đăng ký.\n\nVui lòng đăng nhập hoặc đăng ký tài khoản để nhận ngay 5 VocaHint miễn phí!');
        openAuthModal('login');
        return;
      }

      // 2. RULE: Must have Gemini API Key configured
      const keys = getStoredApiKeys();
      if (keys.length === 0) {
        alert('⚠️ Bạn chưa cấu hình Gemini API Key!\n\nVui lòng vào Cài đặt để thêm API Key trước khi sử dụng AI.');
        openSettingsModal();
        return;
      }
      const geminiApiKey = getEffectiveGeminiApiKey();

      // 3. RULE: Must have hints available
      const currentHints = getUserHints();
      if (currentHints <= 0) {
        if (confirm('🛒 Bạn đã hết VocaHint (0 lượt)!\nSố VoCoin hiện tại: ' + getUserPoints() + ' VoCoin.\n\nBạn có muốn mở VocaStore để đổi 50 VoCoin lấy 1 VocaHint mới không?')) {
          openShopModal();
        }
        return;
      }

      hintBox.style.display = 'block';
      hintText.innerHTML = '✨ <em>VocaAI đang tạo VocaHint ngữ cảnh...</em>';

      try {
        const cachedModel = localStorage.getItem('vocaflow_gemini_working_model');
        const standardModels = (typeof GEMINI_STANDARD_MODELS !== 'undefined' && GEMINI_STANDARD_MODELS.length > 0) ? GEMINI_STANDARD_MODELS : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
        const modelsToTry = (cachedModel && standardModels.includes(cachedModel)) ? [cachedModel, ...standardModels.filter(m => m !== cachedModel)] : standardModels;
        const prompt = 'Từ vựng tiếng Anh: "' + questionWord.term + '". Nghĩa tiếng Việt: "' + (questionWord.definitionVi || questionWord.definition) + '".\nHãy viết 1 câu gợi ý ngữ cảnh siêu ngắn gọn (dưới 15 từ, bằng tiếng Việt) giúp Flower đoán được nghĩa mà TUYỆT ĐỐI KHÔNG chứa từ "' + (questionWord.definitionVi || questionWord.definition) + '" hay từ "' + questionWord.term + '".\nVí dụ từ "wicked": "Gợi ý: Thường miêu tả tính cách nhân vật phản diện trong truyện cổ tích."\nChỉ trả về DUY NHẤT 1 câu gợi ý đó.';

        for (const m of modelsToTry) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + geminiApiKey.trim(), {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 60, temperature: 0.3 },
                safetySettings: [
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
              })
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              const rawHint = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (rawHint) {
                setUserHints(currentHints - 1);
                hintText.innerHTML = '✨ <strong>VocaHint:</strong> ' + escapeHtml(rawHint);
                showToast('💡 Đã dùng 1 VocaHint (còn ' + getUserHints() + ' lượt).');
                return;
              }
            }
          } catch (modelErr) {
            console.warn('AI Hint model try error for ' + m + ':', modelErr);
          }
        }
      } catch (err) {
        console.warn('AI Hint generation error:', err);
      }

      // Fallback local smart cloze hint if AI fails
      let localHint = '';
      if (questionWord.exampleSentence) {
        const termRegex = new RegExp(questionWord.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const clozeEx = questionWord.exampleSentence.replace(termRegex, '[ ... ]');
        localHint = '💡 Ví dụ ngữ cảnh: "' + clozeEx + '"';
      } else if (questionWord.collocations && questionWord.collocations.length) {
        localHint = '💡 Cụm từ đi kèm: ' + questionWord.collocations.join(', ');
      } else if (questionWord.synonyms && questionWord.synonyms.length) {
        localHint = '💡 Từ gần nghĩa (Synonym): ' + questionWord.synonyms.join(', ');
      }

      setUserHints(currentHints - 1);
      hintText.innerHTML = localHint || ('💡 Từ này thuộc loại: <strong>' + (questionWord.partOfSpeech || 'từ vựng').toUpperCase() + '</strong> (Cấp độ: ' + (questionWord.cefrLevel || 'Chung') + ')');
      showToast('💡 Đã dùng 1 gợi ý (còn ' + getUserHints() + ' lượt).');
    }

    function checkQuizAnswer(selectedButton, isCorrect) {
      if (quizIsAnswered) return;
      quizIsAnswered = true;

      const questionWord = (quizList && quizIndex < quizList.length) ? quizList[quizIndex] : null;
      const correctDef = questionWord ? (questionWord.definitionVi || questionWord.definition || '').trim() : '';

      // 1. Immediately render word details & AI commentary FIRST (Zero delay, always executed)
      if (questionWord) {
        try { renderWordDetailsCard('quiz', questionWord); } catch (e) { console.warn('renderWordDetailsCard error:', e); }
        try { loadQuizAiExplanation(questionWord, correctDef, currentQuizChoices); } catch (e) { console.warn('loadQuizAiExplanation error:', e); }
      }

      // 2. Immediately trigger VIP Meme reaction
      try {
        if (typeof triggerVipMemeReaction === 'function') {
          triggerVipMemeReaction(isCorrect ? 'right' : 'fail');
        }
      } catch (e) {
        console.warn('triggerVipMemeReaction error:', e);
      }

      // 3. Highlight options
      const allButtons = document.querySelectorAll('#quiz-options-container .quiz-option');
      allButtons.forEach(btn => {
        btn.classList.add('disabled');
        btn.disabled = true;
      });

      if (selectedButton) {
        selectedButton.classList.add(isCorrect ? 'correct' : 'wrong');
      }

      const normCorrect = correctDef.toLowerCase();
      allButtons.forEach(btn => {
        const txt = (btn.querySelector('.quiz-opt-text')?.textContent || btn.textContent || '').trim().toLowerCase();
        if (txt === normCorrect || (questionWord && questionWord.definitionVi && txt === questionWord.definitionVi.trim().toLowerCase()) || (questionWord && questionWord.definition && txt === questionWord.definition.trim().toLowerCase())) {
          btn.classList.add('correct');
        }
      });

      // 4. Guaranteed UI displays
      const nextCont = document.getElementById('quiz-next-container');
      if (nextCont) {
        nextCont.style.display = 'block';
        const nextBtn = nextCont.querySelector('button');
        if (nextBtn) nextBtn.focus();
      }
      const detailsBox = document.getElementById('quiz-word-details-box');
      if (detailsBox) {
        detailsBox.style.display = 'block';
      }

      // 5. Score, sound, streak & economy
      try {
        if (quizQuestionStartTime) {
          quizActiveTimeMs += (Date.now() - quizQuestionStartTime);
          quizQuestionStartTime = null;
        }

        const delta = getQuizPointDelta(questionWord?.cefrLevel, isCorrect);
        quizPointsEarned += delta;
        quizScore += delta;

        const scoreEl = document.getElementById('quiz-score');
        if (scoreEl) scoreEl.textContent = 'Bài: ' + (quizScore >= 0 ? '+' : '') + quizScore + 'đ';

        // Always record study flow action on practice
        try { if (typeof recordStudyFlowAction === 'function') recordStudyFlowAction('quiz'); } catch (e) {}

        if (isCorrect) {
          quizCorrectCount++;
          try { playVocaSfx('correct'); } catch (e) {}
          if (!quizIsHintUsedThisQuestion) {
            quizNoHintCurrentStreak = (quizNoHintCurrentStreak || 0) + 1;
            try {
              if (typeof updateAchievementProgress === 'function') updateAchievementProgress('skill_quiz_streak_30', quizNoHintCurrentStreak);
              if (quizNoHintCurrentStreak >= 30 && typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('skill_quiz_streak_30');
            } catch (e) {}
          } else {
            quizNoHintCurrentStreak = 0;
          }

          if (questionWord) {
            try {
              removeWordFromMistakeList(questionWord, false);
              const { masteryGain } = getQuizScoringDeltas(currentQuizDifficulty, true);
              const { newScore } = updateWordMasteryScore(questionWord, masteryGain);
              saveDatabase(true);
              showToast(`🎉 Đúng rồi (+${delta} Xu)! Thuộc bài: ${newScore}%`);
            } catch (e) {
              showToast(`🎉 Đúng rồi (+${delta} Xu)!`);
            }
          }
        } else {
          quizWrongCount++;
          quizNoHintCurrentStreak = 0;
          try { playVocaSfx('wrong'); } catch (e) {}

          if (questionWord) {
            try {
              addWordToMistakeList(questionWord, 'quiz');
              if (!quizSessionWrongWords.some(w => (w.id && w.id === questionWord.id) || (w.term && w.term.toLowerCase() === questionWord.term.toLowerCase()))) {
                quizSessionWrongWords.push(questionWord);
              }
              const { masteryPenalty } = getQuizScoringDeltas(currentQuizDifficulty, false);
              const { newScore } = updateWordMasteryScore(questionWord, -masteryPenalty);
              saveDatabase(true);
              showToast(`⚠️ Chưa đúng (${delta} Xu)! Thuộc bài: ${newScore}%`);
            } catch (e) {
              showToast(`⚠️ Chưa đúng (${delta} Xu)!`);
            }
          }
        }
      } catch (err) {
        console.error('Quiz stats update error:', err);
      }
    }

    function useQuizSkip() {
      if (quizIsAnswered) {
        nextQuizQuestion();
        return;
      }
      playVocaSfx('skip');
      if (quizQuestionStartTime) {
        quizActiveTimeMs += (Date.now() - quizQuestionStartTime);
        quizQuestionStartTime = null;
      }
      const questionWord = (quizList && quizIndex < quizList.length) ? quizList[quizIndex] : null;
      if (!questionWord) return;

      const curSkips = getUserSkips();
      const curPts = getUserPoints();
      const skipCost = 100;

      if (curSkips <= 0 && curPts < skipCost) {
        showToast('🪙 Bạn không đủ VoCoin (cần 100 VoCoin để đổi 1 lượt VocaSkip)');
        openShopModal();
        return;
      }

      if (curSkips > 0) {
        setUserSkips(curSkips - 1);
        showToast('⏭️ Đã dùng 1 lượt VocaSkip miễn phí (còn ' + getUserSkips() + ' lượt).');
      } else {
        setUserPoints(curPts - skipCost);
        showToast('⏭️ Đã dùng 100 VoCoin để VocaSkip câu này.');
      }

      quizSkipCount++;
      addWordToMistakeList(questionWord, 'quiz');
      if (!quizSessionWrongWords.some(w => (w.id && w.id === questionWord.id) || (w.term && w.term.toLowerCase() === questionWord.term.toLowerCase()))) {
        quizSessionWrongWords.push(questionWord);
      }

      // Update word timestamp so SRS tracks it as practiced
      questionWord.updatedAt = new Date().toISOString();
      const wIdx = words.findIndex(w => w.id === questionWord.id);
      if (wIdx >= 0) words[wIdx].updatedAt = questionWord.updatedAt;
      saveDatabase(true);

      quizIsAnswered = true;
      if (typeof updateEconomyUI === 'function') updateEconomyUI();

      // Highlight correct answer button in green
      const correctDef = (questionWord._activeQuizSense?.definitionVi || questionWord._activeQuizSense?.definition || questionWord.definitionVi || questionWord.definition || '').trim().toLowerCase();
      const allButtons = document.querySelectorAll('#quiz-options-container .quiz-option');
      allButtons.forEach(btn => {
        btn.classList.add('disabled');
        btn.disabled = true;
        const txt = (btn.querySelector('.quiz-opt-text')?.textContent || btn.textContent || '').trim().toLowerCase();
        if (txt === correctDef || (questionWord.definitionVi && txt === questionWord.definitionVi.trim().toLowerCase()) || (questionWord.definition && txt === questionWord.definition.trim().toLowerCase())) {
          btn.classList.add('correct');
        }
      });

      if (questionWord) {
        renderWordDetailsCard('quiz', questionWord);
        loadQuizAiExplanation(questionWord, correctDef, currentQuizChoices);
      }
      const quizNextCont = document.getElementById('quiz-next-container');
      if (quizNextCont) {
        quizNextCont.style.display = 'block';
        const qNextBtn = quizNextCont.querySelector('button');
        if (qNextBtn) {
          qNextBtn.className = 'btn btn-warning';
          qNextBtn.style.background = 'linear-gradient(135deg, #d97706, #b45309)';
          qNextBtn.style.boxShadow = '0 4px 14px rgba(217,119,6,0.35)';
          qNextBtn.innerHTML = '<span>⏭️ Bỏ Qua • Câu tiếp theo</span> <kbd class="key-shortcut-badge">Enter ↵</kbd>';
          qNextBtn.focus();
        }
      }
    }
    window.useQuizSkip = useQuizSkip;

    function nextQuizQuestion() {
      if (typeof dismissVipMemeOverlay === 'function') dismissVipMemeOverlay();
      quizIndex++;
      if (quizIndex < quizList.length) {
        loadQuizQuestion();
      } else {
        finishQuizAndShowResult();
      }
    }

    function finishQuizAndShowResult() {
      if (quizQuestionStartTime) {
        quizActiveTimeMs += (Date.now() - quizQuestionStartTime);
        quizQuestionStartTime = null;
      }

      if (quizIsCompleted) {
        openModal('modal-quiz-result');
        return;
      }
      quizIsCompleted = true;

      const totalSeconds = Math.max(1, Math.round((Date.now() - (quizStartTime || Date.now())) / 1000));
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const durationText = mins > 0 ? (mins + 'm ' + (secs < 10 ? '0' : '') + secs + 's') : (secs + ' giây');

      const total = quizTotalQuestions || quizList.length || 1;
      const accuracyPct = Math.round((quizCorrectCount / total) * 100);
      const spq = (totalSeconds / total).toFixed(1);

      const res = calculateSessionFinalPoints(quizPointsEarned, total, total, true);
      quizPointsEarned = res.finalPts;
      if (quizPointsEarned !== 0) {
        const curDeckTitle = (typeof currentDeck !== 'undefined' && currentDeck?.title) || 'Quiz';
        const newBalance = Math.max(0, getUserPoints() + quizPointsEarned);
        setUserPoints(newBalance);
        addLedgerEntry(quizPointsEarned > 0 ? 'STUDY' : 'PENALTY_QUIT', quizPointsEarned, `Hoàn thành bài Quiz "${curDeckTitle}" (${quizCorrectCount}/${total} câu, x${res.combinedMult})`, newBalance);
        saveDatabase(true);
        pushCurrentDatabaseToCloud();
      }

      if (total >= 50 && accuracyPct >= 100 && (quizHintsUsed || 0) === 0) {
        if (typeof checkAndUnlockAchievement === 'function') checkAndUnlockAchievement('skill_perfect_session_50_hard');
      }

      // Auto-publish community milestone on long / perfect study sessions
      if (typeof autoPublishCommunityMilestone === 'function') {
        if (total >= 50 && accuracyPct >= 100) {
          autoPublishCommunityMilestone('study_perfect', { mode: 'quiz', total, accuracyPct, difficulty: currentQuizDifficulty, points: quizPointsEarned });
        } else if (total >= 30) {
          autoPublishCommunityMilestone('study_marathon', { mode: 'quiz', total, accuracyPct, difficulty: currentQuizDifficulty, points: quizPointsEarned });
        }
      }

      const scoreRatioEl = document.getElementById('quiz-res-score-ratio');
      const pointsEl = document.getElementById('quiz-res-points');
      const durationEl = document.getElementById('quiz-res-duration');
      const spqEl = document.getElementById('quiz-res-spq');
      const hintsEl = document.getElementById('quiz-res-hints');
      const skipsEl = document.getElementById('quiz-res-skips');
      const wrongsEl = document.getElementById('quiz-res-wrongs');
      const badgeIconEl = document.getElementById('quiz-res-badge-icon');
      const titleEl = document.getElementById('quiz-res-title');
      const subtitleEl = document.getElementById('quiz-res-subtitle');

      const diffBadgeEl = document.getElementById('quiz-res-difficulty-badge');
      if (diffBadgeEl) {
        diffBadgeEl.textContent = '🎯 Cấp độ: ' + getDifficultyLabel(currentQuizDifficulty);
      }
      if (scoreRatioEl) scoreRatioEl.textContent = quizCorrectCount + '/' + total + ' (' + accuracyPct + '%)';
      if (pointsEl) pointsEl.textContent = (quizPointsEarned >= 0 ? '+' : '') + quizPointsEarned + ' VoCoin (Quy mô x' + res.deckLengthMult + ')';
      if (durationEl) durationEl.textContent = durationText;
      if (spqEl) spqEl.textContent = spq + 's / câu';
      if (hintsEl) hintsEl.textContent = quizHintsUsed + ' lượt';
      if (skipsEl) skipsEl.textContent = quizSkipCount + ' câu';
      if (wrongsEl) wrongsEl.textContent = quizWrongCount + ' câu';

      // WRONG QUESTIONS RETRY BANNER (v0.10.9-37)
      const wrongBannerEl = document.getElementById('quiz-res-wrong-banner');
      const wrongCountEl = document.getElementById('quiz-res-wrong-count');
      const wrongBtnLabelEl = document.getElementById('quiz-res-wrong-btn-label');
      if (wrongBannerEl) {
        if (quizSessionWrongWords && quizSessionWrongWords.length > 0) {
          wrongBannerEl.style.display = 'block';
          if (wrongCountEl) wrongCountEl.textContent = quizSessionWrongWords.length + ' câu';
          if (wrongBtnLabelEl) wrongBtnLabelEl.textContent = quizSessionWrongWords.length + ' câu sai';
        } else {
          wrongBannerEl.style.display = 'none';
        }
      }

      if (accuracyPct >= 100) {
        if (badgeIconEl) badgeIconEl.textContent = '🏆';
        if (titleEl) titleEl.textContent = 'Tuyệt Đối Xuất Sắc!';
        if (subtitleEl) subtitleEl.textContent = 'Bạn đã trả lời đúng 100% tất cả câu hỏi!';
      } else if (accuracyPct >= 80) {
        if (badgeIconEl) badgeIconEl.textContent = '🌟';
        if (titleEl) titleEl.textContent = 'Quá Đỉnh! Rất Thành Thạo!';
        if (subtitleEl) subtitleEl.textContent = 'Trí nhớ của bạn về VocaDeck này đang cực kỳ tốt!';
      } else if (accuracyPct >= 50) {
        if (badgeIconEl) badgeIconEl.textContent = '🌿';
        if (titleEl) titleEl.textContent = 'Làm Tốt Lắm!';
        if (subtitleEl) subtitleEl.textContent = 'Hãy tiếp tục ôn tập để nâng cao độ thành thạo nhé!';
      } else {
        if (badgeIconEl) badgeIconEl.textContent = '💪';
        if (titleEl) titleEl.textContent = 'Cố Lên Nào!';
        if (subtitleEl) subtitleEl.textContent = 'Luyện tập thêm một vài lượt nữa là thuộc làu ngay!';
      }

      openModal('modal-quiz-result');
      playVocaSfx('fireworks', true);
      if (typeof recordLessonCompleted === 'function') recordLessonCompleted('quiz');
      try { if (typeof recordStudyFlowAction === 'function') recordStudyFlowAction('quiz'); } catch (e) {}

      const intensity = accuracyPct / 100;
      setTimeout(() => {
        launchFireworks(intensity);
      }, 100);
    }

    function launchFireworks(intensity) {
      if (typeof intensity !== 'number') intensity = 1.0;
      const canvas = document.getElementById('quiz-fireworks-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = canvas.parentElement.clientWidth || 480;
      canvas.height = canvas.parentElement.clientHeight || 420;

      if (fireworksAnimationId) {
        cancelAnimationFrame(fireworksAnimationId);
        fireworksAnimationId = null;
      }

      const particles = [];
      const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#38bdf8', '#fbbf24', '#a855f7', '#f43f5e'];
      const count = Math.min(180, Math.floor(40 + intensity * 120));

      function createExplosion(x, y, power) {
        for (let i = 0; i < power; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (Math.random() * 5 + 2) * (0.8 + intensity * 0.4);
          particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            radius: Math.random() * 3.5 + 1.5,
            alpha: 1,
            decay: Math.random() * 0.015 + 0.01,
            gravity: 0.12
          });
        }
      }

      function createRandomRocket() {
        const x = Math.random() * (canvas.width * 0.7) + (canvas.width * 0.15);
        const y = Math.random() * (canvas.height * 0.5) + (canvas.height * 0.15);
        createExplosion(x, y, Math.floor(count / 3));
      }

      createRandomRocket();
      createRandomRocket();
      setTimeout(() => createRandomRocket(), 250);
      setTimeout(() => createRandomRocket(), 500);

      let frames = 0;
      function animate() {
        frames++;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.alpha -= p.decay;

          if (p.alpha <= 0 || p.y > canvas.height + 20) {
            particles.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (particles.length > 0 && frames < 240) {
          fireworksAnimationId = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          fireworksAnimationId = null;
        }
      }

      fireworksAnimationId = requestAnimationFrame(animate);
    }

    function retryQuizFromModal() {
      closeModal('modal-quiz-result');
      startQuizMode();
    }

    window.exitQuizSession = function() { exitQuiz(); };
    window.exitSpellingSession = function() { exitSpelling(); };
    function exitQuiz() {
      checkAndApplyPendingAppUpdate();
      stopAllAudio();
      const total = quizTotalQuestions || (quizList ? quizList.length : 1);
      const done = Math.min(total, quizIndex + (quizIsAnswered ? 1 : 0));

      if (!quizIsCompleted && (done > 0 || quizPointsEarned !== 0)) {
        promptStudyEarlyExit({
          mode: 'quiz',
          done,
          total,
          basePoints: quizPointsEarned,
          onConfirmExit: () => doExecuteExitQuiz(done, total)
        });
        return;
      }
      doExecuteExitQuiz(done, total);
    }

    function doExecuteExitQuiz(done, total) {
      stopAllAudio();
      if (done > 0) {
        try { if (typeof recordStudyFlowAction === 'function') recordStudyFlowAction('quiz'); } catch (e) {}
      }
      try {
        // Progressive incomplete session leniency / penalty (v0.10.9-alpha-23 - Balance v2)
        if (!quizIsCompleted && quizPointsEarned !== 0) {
          const res = calculateSessionFinalPoints(quizPointsEarned, done, total, false);
          const finalPts = res.finalPts;

          if (finalPts !== 0) {
            const curDeck = decks.find(d => d.id === currentDeckId);
            const curDeckTitle = curDeck ? curDeck.title : 'Quiz';
            const pctText = Math.round((done / total) * 100);
            const newBalance = Math.max(0, getUserPoints() + finalPts);
            setUserPoints(newBalance);
            if (finalPts < 0) {
              showToast(`⚠️ Bỏ dở Quiz khi âm điểm (${done}/${total} câu - ${pctText}% • Phạt chia /${res.combinedMult}): Trừ ${finalPts} VoCoin!`);
              addLedgerEntry('PENALTY_QUIT', finalPts, `Bỏ dở bài Quiz "${curDeckTitle}" khi âm điểm (${done}/${total} câu, phạt /${res.combinedMult})`, newBalance);
            } else {
              const bonusText = res.milestoneBonus > 0 ? ` + Thưởng mốc ${done} câu (+${res.milestoneBonus} VoCoin)` : '';
              showToast(`🎉 Bỏ dở Quiz (${done}/${total} câu - ${pctText}% • Hoàn thành x${res.completionMult}, Quy mô x${res.deckLengthMult}${bonusText}): Nhận +${finalPts} VoCoin!`);
              addLedgerEntry('STUDY', finalPts, `Bỏ dở bài Quiz "${curDeckTitle}" (${done}/${total} câu, x${res.combinedMult}${bonusText})`, newBalance);
            }
            saveDatabase(true);
            pushCurrentDatabaseToCloud();
          }
          quizPointsEarned = finalPts;
        }
      } catch (errPoints) {
        console.warn('Quiz points settlement error:', errPoints);
      }

      try {
        if (studySourceContext === 'review-queue' || !currentDeckId) {
          showScreen('screen-decks');
          refreshActiveScreenData();
        } else {
          openDeckDetail(currentDeckId);
        }
      } catch (errNav) {
        console.warn('Quiz navigation fallback:', errNav);
        showScreen('screen-decks');
        refreshActiveScreenData();
      }
    }

    function exitQuizToDeck() {
      stopVocaSfx('fireworks');
      checkAndApplyPendingAppUpdate();
      closeModal('modal-quiz-result');
      if (studySourceContext === 'review-queue' || !currentDeckId) {
        showScreen('screen-decks');
        refreshActiveScreenData();
      } else {
        openDeckDetail(currentDeckId);
      }
    }

    function exitQuizToHome() {
      stopVocaSfx('fireworks');
      checkAndApplyPendingAppUpdate();
      closeModal('modal-quiz-result');
      showScreen('screen-decks');
      refreshActiveScreenData();
    }

    function speakQuizTerm() {
      if (!quizList || quizList.length === 0 || quizIndex >= quizList.length) return;
      const questionWord = quizList[quizIndex];
      if (questionWord && questionWord.term) {
        speakText(questionWord.term);
      }
    }
