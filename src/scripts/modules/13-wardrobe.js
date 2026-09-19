// =========================================================================
// VOCAFLOW 13-WARDROBE.JS (v0.10.10-41 Build 342)
// Hệ Thống Tủ Đồ Cá Nhân: Khung Viền Avatar, Hiệu Ứng Tên & Danh Xưng
// =========================================================================

(function() {
  'use strict';

  const STORAGE_KEY_EQUIPPED_WARDROBE = 'vocaflow_equipped_wardrobe';

  // 1. REGISTRY TỦ ĐỒ (REGISTRY OF ALL WARDROBE ITEMS)
  const VOCAFLOW_WARDROBE_REGISTRY = {
    frames: [
      {
        id: 'default',
        name: 'Khung Mặc Định',
        tier: 0,
        minLevel: 1,
        desc: 'Viền tròn thanh lịch cơ bản của mọi Flower.',
        badge: 'Mặc định',
        badgeColor: '#10b981',
        icon: '⚪'
      },
      {
        id: 'bronze',
        name: 'Khung Đồng Sơ Cấp',
        tier: 1,
        minLevel: 10,
        desc: 'Huy hiệu sao đồng & đinh tán cổ phong chạm khắc.',
        badge: 'Cấp 10+',
        badgeColor: '#cd7f32',
        icon: '🥉'
      },
      {
        id: 'silver',
        name: 'Khung Bạc Tinh Xảo',
        tier: 2,
        minLevel: 20,
        desc: 'Cánh chim bạch kim & hoa văn hiệp sĩ thanh lịch.',
        badge: 'Cấp 20+',
        badgeColor: '#e0e0e0',
        icon: '🥈'
      },
      {
        id: 'gold',
        name: 'Khung Vàng Hoàng Gia',
        tier: 3,
        minLevel: 30,
        desc: 'Vương miện hoàng kim 12h & nạm ngọc ruby đáy khiên.',
        badge: 'Cấp 30+',
        badgeColor: '#ffd700',
        icon: '🥇'
      },
      {
        id: 'diamond',
        name: 'Khung Lam Ngọc',
        tier: 4,
        minLevel: 40,
        desc: 'Giác cắt kim cương 3D bất đối xứng & hào quang lam ngọc.',
        badge: 'Cấp 40+',
        badgeColor: '#00e5ff',
        icon: '💎'
      },
      {
        id: 'mythic',
        name: 'Rồng Hồng Thần Thoại',
        tier: 5,
        minLevel: 50,
        desc: 'Rồng hồng thần thoại quấn quanh, cánh dơi & khè lửa plasma.',
        badge: 'Cấp 50 MAX',
        badgeColor: '#ff007f',
        icon: '🐉'
      }
    ],
    nameEffects: [
      {
        id: 'default',
        name: 'Tên Mặc Định',
        tier: 0,
        minLevel: 1,
        desc: 'Chữ tiêu chuẩn sắc nét nguyên bản.',
        badge: 'Mặc định',
        badgeColor: '#10b981',
        icon: '📝'
      },
      {
        id: 'bronze',
        name: 'Tên Đồng Sơ Cấp',
        tier: 1,
        minLevel: 10,
        desc: 'Ánh đồng trầm ấm cổ điển, text-shadow ấm áp.',
        badge: 'Cấp 10+',
        badgeColor: '#cd7f32',
        icon: '🥉'
      },
      {
        id: 'silver',
        name: 'Tên Bạc Tinh Xảo',
        tier: 2,
        minLevel: 20,
        desc: 'Ánh kim bạch kim phát sáng huyền ảo khi rê chuột.',
        badge: 'Cấp 20+',
        badgeColor: '#e0e0e0',
        icon: '🥈'
      },
      {
        id: 'gold',
        name: 'Tên Vàng Hoàng Gia',
        tier: 3,
        minLevel: 30,
        desc: 'Gradient hoàng kim quét động & lấp lánh Blink Blink (✨).',
        badge: 'Cấp 30+',
        badgeColor: '#ffd700',
        icon: '🥇'
      },
      {
        id: 'diamond',
        name: 'Tên Lam Ngọc',
        tier: 4,
        minLevel: 40,
        desc: 'Neon xanh băng, tia phản quang & đốm sáng kim cương.',
        badge: 'Cấp 40+',
        badgeColor: '#00e5ff',
        icon: '💎'
      },
      {
        id: 'mythic',
        name: 'Tên Thần Thoại Conic',
        tier: 5,
        minLevel: 50,
        desc: 'Hồng neon Cyberpunk, hiệu ứng Glitch 2 màu & ngọn lửa hồng.',
        badge: 'Cấp 50 MAX',
        badgeColor: '#ff007f',
        icon: '🐉'
      }
    ],
    titles: [
      {
        id: 'default',
        name: 'Flower VocaFlow',
        tag: '🎓 Flower VocaFlow',
        minLevel: 1,
        desc: 'Danh xưng khởi đầu của mọi Flower rèn luyện từ vựng.',
        badge: 'Mặc định',
        color: '#10b981'
      },
      {
        id: 'lv10',
        name: 'Tập Sự',
        tag: '🌱 Tập Sự',
        minLevel: 10,
        desc: 'Chạm mốc Cấp 10 - Tinh thần học tập khởi sắc.',
        badge: 'Cấp 10+',
        color: '#f59e0b'
      },
      {
        id: 'lv20',
        name: 'Am Hiểu',
        tag: '⚡ Am Hiểu',
        minLevel: 20,
        desc: 'Chạm mốc Cấp 20 - Vốn từ vựng vững vàng.',
        badge: 'Cấp 20+',
        color: '#38bdf8'
      },
      {
        id: 'lv30',
        name: 'Chuyên Gia',
        tag: '🔥 Chuyên Gia',
        minLevel: 30,
        desc: 'Chạm mốc Cấp 30 - Làm chủ các kỹ năng ngôn ngữ.',
        badge: 'Cấp 30+',
        color: '#ec4899'
      },
      {
        id: 'lv40',
        name: 'Bậc Thầy',
        tag: '👑 Bậc Thầy',
        minLevel: 40,
        desc: 'Chạm mốc Cấp 40 - Đẳng cấp rèn luyện xuất chúng.',
        badge: 'Cấp 40+',
        color: '#a855f7'
      },
      {
        id: 'lv50',
        name: 'Huyền Thoại',
        tag: '🌟 Huyền Thoại',
        minLevel: 50,
        desc: 'Chạm mốc Cấp 50 Tối Thượng - Đỉnh cao tri thức Flower.',
        badge: 'Cấp 50 MAX',
        color: '#eab308'
      }
    ]
  };
  window.VOCAFLOW_WARDROBE_REGISTRY = VOCAFLOW_WARDROBE_REGISTRY;

  let activeWardrobeTab = 'frames';
  let wardrobePreviewState = null;

  // 2. STATE STORAGE & RETRIEVAL
  function getEquippedWardrobe() {
    try {
      if (typeof currentUser !== 'undefined' && currentUser && currentUser.equippedWardrobe && typeof currentUser.equippedWardrobe === 'object') {
        return {
          frame: currentUser.equippedWardrobe.frame || 'default',
          nameEffect: currentUser.equippedWardrobe.nameEffect || 'default',
          title: currentUser.equippedWardrobe.title || 'default'
        };
      }
      const raw = localStorage.getItem(STORAGE_KEY_EQUIPPED_WARDROBE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            frame: parsed.frame || 'default',
            nameEffect: parsed.nameEffect || 'default',
            title: parsed.title || 'default'
          };
        }
      }
    } catch (e) {
      console.warn('Error reading equipped wardrobe:', e);
    }
    return { frame: 'default', nameEffect: 'default', title: 'default' };
  }
  window.getEquippedWardrobe = getEquippedWardrobe;

  function setEquippedWardrobe(equippedObj) {
    if (!equippedObj || typeof equippedObj !== 'object') return;
    const clean = {
      frame: equippedObj.frame || 'default',
      nameEffect: equippedObj.nameEffect || 'default',
      title: equippedObj.title || 'default',
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_EQUIPPED_WARDROBE, JSON.stringify(clean));
    if (typeof currentUser !== 'undefined' && currentUser) {
      currentUser.equippedWardrobe = clean;
      localStorage.setItem('vocaflow_auth_user', JSON.stringify(currentUser));
    }
    applyWardrobeToActiveUI();
    if (typeof pushCurrentDatabaseToCloud === 'function') {
      pushCurrentDatabaseToCloud();
    }
  }
  window.setEquippedWardrobe = setEquippedWardrobe;

  function isWardrobeItemUnlocked(category, itemId) {
    if (!itemId || itemId === 'default') return true;
    const userLevel = (typeof getCurrentUserLevelInfo === 'function') ? getCurrentUserLevelInfo().level : 1;
    const list = VOCAFLOW_WARDROBE_REGISTRY[category] || [];
    const item = list.find(i => i.id === itemId);
    if (!item) return false;
    return userLevel >= (item.minLevel || 1);
  }
  window.isWardrobeItemUnlocked = isWardrobeItemUnlocked;

  function equipWardrobeItem(category, itemId) {
    if (!isWardrobeItemUnlocked(category, itemId)) {
      if (typeof showToast === 'function') {
        const item = (VOCAFLOW_WARDROBE_REGISTRY[category] || []).find(i => i.id === itemId);
        showToast(`🔒 Cần đạt Cấp độ ${item ? item.minLevel : 10} để trang bị vật phẩm này!`);
      }
      return;
    }
    const current = getEquippedWardrobe();
    current[category === 'frames' ? 'frame' : (category === 'nameEffects' ? 'nameEffect' : 'title')] = itemId;
    setEquippedWardrobe(current);
    wardrobePreviewState = { ...current };
    renderWardrobePreview();
    renderWardrobeTabContent(activeWardrobeTab);

    if (typeof playSfx === 'function') playSfx('award');
    if (typeof showToast === 'function') {
      const item = (VOCAFLOW_WARDROBE_REGISTRY[category] || []).find(i => i.id === itemId);
      showToast(`✨ Đã trang bị thành công: ${item ? item.name : itemId}!`);
    }
  }
  window.equipWardrobeItem = equipWardrobeItem;

  function unequipWardrobeItem(category) {
    const current = getEquippedWardrobe();
    current[category === 'frames' ? 'frame' : (category === 'nameEffects' ? 'nameEffect' : 'title')] = 'default';
    setEquippedWardrobe(current);
    wardrobePreviewState = { ...current };
    renderWardrobePreview();
    renderWardrobeTabContent(activeWardrobeTab);

    if (typeof playSfx === 'function') playSfx('click');
    if (typeof showToast === 'function') {
      showToast(`🔄 Đã gỡ trang bị, trở về mặc định.`);
    }
  }
  window.unequipWardrobeItem = unequipWardrobeItem;

  function previewWardrobeItem(category, itemId) {
    if (!wardrobePreviewState) wardrobePreviewState = { ...getEquippedWardrobe() };
    wardrobePreviewState[category === 'frames' ? 'frame' : (category === 'nameEffects' ? 'nameEffect' : 'title')] = itemId;
    renderWardrobePreview(wardrobePreviewState);
  }
  window.previewWardrobeItem = previewWardrobeItem;

  // 3. UNIVERSAL RENDERING HELPERS
  function renderAvatarWithFrameHtml(avatarVal, size = 64, frameId = null, extraClasses = '') {
    const fId = frameId || getEquippedWardrobe().frame || 'default';
    const innerSize = Math.round(size * 0.76);
    const avHtml = (typeof renderAvatarHtml === 'function')
      ? renderAvatarHtml(avatarVal, innerSize, Math.round(innerSize * 0.45))
      : `<span style="font-size:${Math.round(innerSize*0.45)}px;">👤</span>`;

    let overlaySvg = '';

    if (fId === 'bronze') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 2px 8px rgba(205, 127, 50, 0.4));">
          <defs>
            <linearGradient id="vfBronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f5b041" />
              <stop offset="25%" stop-color="#ba4a00" />
              <stop offset="50%" stop-color="#f8c471" />
              <stop offset="75%" stop-color="#7e380e" />
              <stop offset="100%" stop-color="#e59866" />
            </linearGradient>
            <linearGradient id="vfBronzeStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff2a8" /><stop offset="50%" stop-color="#f39c12" /><stop offset="100%" stop-color="#a04000" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="236" fill="none" stroke="url(#vfBronzeGrad)" stroke-width="26" />
          <circle cx="300" cy="300" r="252" fill="none" stroke="#f8c471" stroke-width="4" opacity="0.8" />
          <g fill="#fbeee6" stroke="#4a2108" stroke-width="2">
            <circle cx="300" cy="54" r="7" /><circle cx="474" cy="126" r="7" /><circle cx="546" cy="300" r="7" /><circle cx="474" cy="474" r="7" />
            <circle cx="126" cy="474" r="7" /><circle cx="54" cy="300" r="7" /><circle cx="126" cy="126" r="7" />
          </g>
          <g transform="translate(0, -10)">
            <path d="M 200,530 L 400,530 L 415,555 L 300,595 L 185,555 Z" fill="#1e0c04" stroke="url(#vfBronzeGrad)" stroke-width="6" />
            <path d="M 300,540 L 306,555 L 322,555 L 309,565 L 314,580 L 300,570 L 286,580 L 291,565 L 278,555 L 294,555 Z" fill="url(#vfBronzeStarGrad)" stroke="#fff" stroke-width="1" />
          </g>
        </svg>
      `;
    } else if (fId === 'silver') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.35));">
          <defs>
            <linearGradient id="vfSilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="25%" stop-color="#95a5a6" /><stop offset="50%" stop-color="#ecf0f1" /><stop offset="75%" stop-color="#7f8c8d" /><stop offset="100%" stop-color="#dcdde1" />
            </linearGradient>
            <linearGradient id="vfSilverStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="50%" stop-color="#dcdde1" /><stop offset="100%" stop-color="#718093" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="236" fill="none" stroke="url(#vfSilverGrad)" stroke-width="24" />
          <circle cx="300" cy="300" r="252" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="20 14 6 14" opacity="0.85" />
          <g fill="#ffffff">
            <polygon points="300,42 310,58 290,58" /><polygon points="558,300 542,310 542,290" /><polygon points="42,300 58,290 58,310" />
          </g>
          <g transform="translate(0, -10)">
            <path d="M 190,530 L 410,530 Q 435,550 405,575 L 300,598 L 195,575 Q 165,550 190,530 Z" fill="#111620" stroke="url(#vfSilverGrad)" stroke-width="5" />
            <path d="M 180,540 C 135,530 105,550 90,570 C 120,570 160,560 190,555 Z" fill="url(#vfSilverGrad)" stroke="#57606f" stroke-width="1.5" />
            <path d="M 420,540 C 465,530 495,550 510,570 C 480,570 440,560 410,555 Z" fill="url(#vfSilverGrad)" stroke="#57606f" stroke-width="1.5" />
            <path d="M 280,546 L 284,558 L 297,558 L 286,566 L 290,578 L 280,570 L 270,578 L 274,566 L 263,558 L 276,558 Z" fill="url(#vfSilverStarGrad)" stroke="#ffffff" stroke-width="1" />
            <path d="M 320,546 L 324,558 L 337,558 L 326,566 L 330,578 L 320,570 L 310,578 L 314,566 L 303,558 L 316,558 Z" fill="url(#vfSilverStarGrad)" stroke="#ffffff" stroke-width="1" />
          </g>
        </svg>
      `;
    } else if (fId === 'gold') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 0 12px rgba(241, 196, 15, 0.55));">
          <defs>
            <linearGradient id="vfGoldRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff6bd" /><stop offset="20%" stop-color="#f1c40f" /><stop offset="45%" stop-color="#b78516" /><stop offset="70%" stop-color="#fef3a3" /><stop offset="100%" stop-color="#8a5e04" />
            </linearGradient>
            <linearGradient id="vfGoldStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="35%" stop-color="#fff176" /><stop offset="70%" stop-color="#f59e0b" /><stop offset="100%" stop-color="#b45309" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="236" fill="none" stroke="url(#vfGoldRingGrad)" stroke-width="26" />
          <circle cx="300" cy="300" r="254" fill="none" stroke="#fff3a8" stroke-width="3.5" stroke-dasharray="24 16" />
          <g transform="translate(300, 38)" fill="url(#vfGoldRingGrad)" stroke="#fff" stroke-width="1.2">
            <path d="M -32,20 L -40,-6 L -14,8 L 0,-18 L 14,8 L 40,-6 L 32,20 Z" />
            <circle cx="0" cy="-18" r="4.5" fill="#ffffff" /><circle cx="-40" cy="-6" r="3.5" fill="#ffffff" /><circle cx="40" cy="-6" r="3.5" fill="#ffffff" />
            <circle cx="0" cy="6" r="4.5" fill="#e74c3c" stroke="none" />
          </g>
          <g transform="translate(0, -10)">
            <path d="M 180,530 L 420,530 L 438,558 L 300,600 L 162,558 Z" fill="#1b1202" stroke="url(#vfGoldRingGrad)" stroke-width="6" />
            <path d="M 160,540 C 110,520 80,550 60,575 C 98,582 135,568 165,560 Z" fill="url(#vfGoldRingGrad)" stroke="#784a0a" stroke-width="2" />
            <path d="M 440,540 C 490,520 520,550 540,575 C 502,582 465,568 435,560 Z" fill="url(#vfGoldRingGrad)" stroke="#784a0a" stroke-width="2" />
            <circle cx="300" cy="586" r="5" fill="#e74c3c" stroke="#ffffff" stroke-width="1.2" />
            <path d="M 255,548 L 259,558 L 270,558 L 261,565 L 264,575 L 255,569 L 246,575 L 249,565 L 240,558 L 251,558 Z" fill="url(#vfGoldStarGrad)" stroke="#ffffff" stroke-width="1" />
            <path d="M 300,538 L 305,551 L 319,551 L 308,559 L 312,573 L 300,564 L 288,573 L 292,559 L 281,551 L 295,551 Z" fill="url(#vfGoldStarGrad)" stroke="#ffffff" stroke-width="1.2" />
            <path d="M 345,548 L 349,558 L 360,558 L 351,565 L 354,575 L 345,569 L 336,575 L 339,565 L 330,558 L 341,558 Z" fill="url(#vfGoldStarGrad)" stroke="#ffffff" stroke-width="1" />
          </g>
        </svg>
      `;
    } else if (fId === 'diamond') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 0 14px rgba(0, 229, 255, 0.6));">
          <defs>
            <linearGradient id="vfDiaRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="25%" stop-color="#00e5ff" /><stop offset="50%" stop-color="#e0f7fa" /><stop offset="75%" stop-color="#0091ea" /><stop offset="100%" stop-color="#00b0ff" />
            </linearGradient>
            <linearGradient id="vfGemLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="60%" stop-color="#80deea" /><stop offset="100%" stop-color="#00acc1" />
            </linearGradient>
            <linearGradient id="vfGemDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4dd0e1" /><stop offset="60%" stop-color="#00838f" /><stop offset="100%" stop-color="#004d40" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="238" fill="none" stroke="url(#vfDiaRingGrad)" stroke-width="22" />
          <circle cx="300" cy="300" r="256" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="14 26 50 26" opacity="0.85" />
          <!-- Top Right Asymmetrical Gems -->
          <g transform="translate(425, 145) rotate(22)" filter="drop-shadow(0 0 8px #00e5ff)">
            <polygon points="0,-36 30,-15 30,22 0,42 -30,22 -30,-15" fill="#ffffff" stroke="#e0f7fa" stroke-width="1.8" />
            <polygon points="0,-36 30,-15 46,-38 0,-52" fill="url(#vfGemLight)" stroke="#ffffff" stroke-width="1.2" />
            <polygon points="30,-15 30,22 58,12 46,-38" fill="url(#vfGemDark)" stroke="#ffffff" stroke-width="1.2" />
            <polygon points="30,22 0,42 22,58 58,12" fill="url(#vfGemDark)" stroke="#ffffff" stroke-width="1.2" />
            <polygon points="0,42 -30,22 -22,58 22,58" fill="url(#vfGemLight)" stroke="#ffffff" stroke-width="1.2" />
            <polygon points="-30,22 -30,-15 -58,12 -22,58" fill="url(#vfGemDark)" stroke="#ffffff" stroke-width="1.2" />
            <polygon points="-30,-15 0,-36 -46,-38 -58,12" fill="url(#vfGemLight)" stroke="#ffffff" stroke-width="1.2" />
          </g>
          <!-- Bottom Left Asymmetrical Crystals -->
          <g transform="translate(145, 445) rotate(-38)" filter="drop-shadow(0 0 8px #00e5ff)">
            <polygon points="0,-42 18,0 0,42 -18,0" fill="url(#vfGemLight)" stroke="#ffffff" stroke-width="1.8" />
            <polygon points="0,-42 18,0 0,0" fill="#ffffff" opacity="0.85" />
            <polygon points="0,0 18,0 0,42" fill="url(#vfGemDark)" />
            <polygon points="0,-42 -18,0 0,0" fill="url(#vfGemDark)" />
            <polygon points="0,0 -18,0 0,42" fill="#00acc1" />
          </g>
          <path class="diamond-glint" d="M 450,120 Q 450,138 450,156 Q 450,138 468,138 Q 450,138 450,120 Z" fill="#ffffff" />
          <path class="diamond-glint" d="M 120,460 Q 120,472 120,484 Q 120,472 132,472 Q 120,472 120,460 Z" fill="#ffffff" />
        </svg>
      `;
    } else if (fId === 'mythic') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 0 16px rgba(255, 0, 127, 0.65));">
          <defs>
            <filter id="vfMythicGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="b1" /><feGaussianBlur stdDeviation="16" result="b2" />
              <feMerge><feMergeNode in="b2" /><feMergeNode in="b1" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="vfDragonScales" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff0f8" /><stop offset="25%" stop-color="#ff3399" /><stop offset="65%" stop-color="#99004d" /><stop offset="100%" stop-color="#2b0016" />
            </linearGradient>
            <linearGradient id="vfDragonHorn" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="40%" stop-color="#ffb8db" /><stop offset="85%" stop-color="#a60053" />
            </linearGradient>
            <linearGradient id="vfPlasmaFire" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="20%" stop-color="#ffb3da" /><stop offset="55%" stop-color="#ff007f" /><stop offset="85%" stop-color="#99004d" /><stop offset="100%" stop-color="#ff007f" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g filter="url(#vfMythicGlow)">
            <circle cx="300" cy="300" r="238" fill="none" stroke="#ff007f" stroke-width="8" stroke-linecap="round" />
            <circle cx="300" cy="300" r="248" fill="none" stroke="#ff99cc" stroke-width="2.5" stroke-dasharray="10 18 4 18" opacity="0.8" />
          </g>
          <!-- Dragon Tail & Wings -->
          <g filter="url(#vfMythicGlow)">
            <path d="M 165,415 C 120,465 155,530 220,535 C 275,540 280,488 240,480 C 185,465 155,395 133,325 C 124,295 125,265 128,240" fill="none" stroke="url(#vfDragonScales)" stroke-width="26" stroke-linecap="round" />
            <!-- Dragon Wing at 10h -->
            <path d="M 165,190 Q 110,120 45,85 Q 25,75 5,90 Q 30,105 75,135 Q 115,175 140,225 Z" fill="url(#vfDragonScales)" />
            <!-- Dragon Head & Horns at 12h -->
            <path d="M 128,245 C 120,175 155,128 200,95 C 215,85 232,85 245,95 C 230,115 205,140 185,185 C 170,220 160,250 155,270 Z" fill="url(#vfDragonScales)" />
            <path d="M 228,75 C 220,28 175,-8 118,0 C 160,18 200,48 215,82 Z" fill="url(#vfDragonHorn)" stroke="#ffffff" stroke-width="2" />
            <path d="M 255,85 C 285,92 320,110 340,125 C 305,125 275,110 245,95 Z" fill="url(#vfDragonScales)" />
            <ellipse cx="262" cy="94" rx="8" ry="5" transform="rotate(-15, 262, 94)" class="mythic-eye" fill="#ffccd9" />
          </g>
          <!-- Dragon Plasma Fire Stream Group -->
          <g class="dragon-fire-layer" filter="url(#vfMythicGlow)">
            <path d="M 320,130 C 375,100 455,105 515,160 C 575,215 590,305 560,395 C 530,470 465,530 385,555 C 440,512 470,470 480,405 C 495,310 465,225 400,175 C 368,150 332,138 320,130 Z" fill="url(#vfPlasmaFire)" />
            <circle cx="335" cy="133" r="20" fill="#ffffff" />
            <circle cx="335" cy="133" r="12" fill="#ffb8db" />
          </g>
        </svg>
      `;
    } else {
      // Default circular ring
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600">
          <circle cx="300" cy="300" r="236" fill="none" stroke="rgba(255, 255, 255, 0.22)" stroke-width="12" />
        </svg>
      `;
    }

    return `
      <div class="vf-avatar-frame-box ${extraClasses}" style="width: ${size}px; height: ${size}px;">
        <div class="vf-avatar-inner-circle" style="width: ${innerSize}px; height: ${innerSize}px;">
          ${avHtml}
        </div>
        ${overlaySvg}
      </div>
    `;
  }
  window.renderAvatarWithFrameHtml = renderAvatarWithFrameHtml;

  function renderUsernameWithEffectHtml(rawName, effectId = null, extraClasses = '') {
    const eId = effectId || getEquippedWardrobe().nameEffect || 'default';
    const cleanName = (typeof rawName === 'string' && rawName.trim()) ? rawName.trim() : 'Flower';
    const safeEscaped = (typeof escapeHtml === 'function') ? escapeHtml(cleanName) : cleanName;

    if (eId === 'bronze') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-bronze">${safeEscaped}</strong></span>`;
    }
    if (eId === 'silver') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-silver">${safeEscaped}</strong></span>`;
    }
    if (eId === 'gold') {
      return `
        <span class="vf-name-wrapper ${extraClasses}">
          <strong class="tier-gold">${safeEscaped}</strong>
          <svg class="gold-svg-overlay" viewBox="0 0 230 44">
            <defs>
              <linearGradient id="vfGoldSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" /><stop offset="60%" stop-color="#ffd700" /><stop offset="100%" stop-color="#ff9900" />
              </linearGradient>
            </defs>
            <path class="gold-sparkle gold-sparkle-1" d="M 25,12 Q 25,18 25,24 Q 25,18 31,18 Q 25,18 25,12 Z" fill="url(#vfGoldSparkleGrad)" />
            <path class="gold-sparkle gold-sparkle-2" d="M 115,8 Q 115,16 115,24 Q 115,16 123,16 Q 115,16 115,8 Z" fill="url(#vfGoldSparkleGrad)" />
            <path class="gold-sparkle gold-sparkle-3" d="M 195,20 Q 195,27 195,34 Q 195,27 202,27 Q 195,27 195,20 Z" fill="url(#vfGoldSparkleGrad)" />
            <path class="gold-sparkle gold-sparkle-4" d="M 65,28 Q 65,33 65,38 Q 65,33 70,33 Q 65,33 65,28 Z" fill="url(#vfGoldSparkleGrad)" />
          </svg>
        </span>
      `;
    }
    if (eId === 'diamond') {
      return `
        <span class="vf-name-wrapper ${extraClasses}">
          <strong class="tier-diamond">${safeEscaped}</strong>
          <svg class="diamond-svg-overlay" viewBox="0 0 230 44">
            <defs>
              <linearGradient id="vfDiaSweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
                <stop offset="50%" stop-color="#ffffff" stop-opacity="0.95" />
                <stop offset="100%" stop-color="#00e5ff" stop-opacity="0" />
              </linearGradient>
            </defs>
            <rect class="diamond-sweep-beam" x="-30" y="2" width="28" height="40" fill="url(#vfDiaSweepGrad)" opacity="0" />
            <g class="diamond-sparkle sparkle-1"><circle cx="20" cy="14" r="2.5" fill="#ffffff" /><circle cx="20" cy="14" r="5" fill="#00e5ff" opacity="0.4" /></g>
            <g class="diamond-sparkle sparkle-2"><circle cx="110" cy="8" r="3" fill="#ffffff" /><circle cx="110" cy="8" r="6" fill="#00e5ff" opacity="0.4" /></g>
            <g class="diamond-sparkle sparkle-3"><circle cx="190" cy="18" r="2.5" fill="#ffffff" /><circle cx="190" cy="18" r="5" fill="#00e5ff" opacity="0.4" /></g>
            <g class="diamond-sparkle sparkle-4"><circle cx="70" cy="30" r="2" fill="#ffffff" /></g>
            <g class="diamond-sparkle sparkle-5"><circle cx="150" cy="32" r="2" fill="#ffffff" /></g>
          </svg>
        </span>
      `;
    }
    if (eId === 'mythic') {
      return `
        <span class="vf-name-wrapper ${extraClasses}">
          <strong class="tier-legendary" data-text="${safeEscaped}">${safeEscaped}</strong>
          <div class="legendary-flame-container">
            <svg class="flame-wave-svg" viewBox="0 0 320 80">
              <defs>
                <linearGradient id="vfWaveFlameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#ff007f" stop-opacity="0" />
                  <stop offset="25%" stop-color="#ff007f" stop-opacity="0.6" />
                  <stop offset="50%" stop-color="#ff66b2" stop-opacity="0.9" />
                  <stop offset="75%" stop-color="#ff007f" stop-opacity="0.6" />
                  <stop offset="100%" stop-color="#ff007f" stop-opacity="0" />
                </linearGradient>
              </defs>
              <g class="flame-sweep-group">
                <path d="M 10,45 Q 60,15 110,45 T 210,45 T 310,45 Q 260,70 160,70 Q 60,70 10,45 Z" fill="url(#vfWaveFlameGrad)" />
              </g>
            </svg>
          </div>
        </span>
      `;
    }

    return `<span class="vf-name-wrapper ${extraClasses}"><strong style="color: var(--text);">${safeEscaped}</strong></span>`;
  }
  window.renderUsernameWithEffectHtml = renderUsernameWithEffectHtml;

  function getTitleBadgeHtml(titleId = null) {
    const tId = titleId || getEquippedWardrobe().title || 'default';
    const list = VOCAFLOW_WARDROBE_REGISTRY.titles;
    const item = list.find(t => t.id === tId) || list[0];
    const col = item.color || '#10b981';

    return `
      <span class="badge" style="font-size: 11px; font-weight: 700; padding: 2.5px 8px; border-radius: 6px; background: ${col}20; color: ${col}; border: 1px solid ${col}50;">
        ${escapeHtml(item.tag)}
      </span>
    `;
  }
  window.getTitleBadgeHtml = getTitleBadgeHtml;

  // 4. APPLY EQUIPPED WARDROBE ACROSS ACTIVE APP UI
  function applyWardrobeToActiveUI() {
    const equipped = getEquippedWardrobe();
    const userAvatar = (typeof getUserAvatar === 'function') ? getUserAvatar() : (currentUser?.avatar || '👤');
    const userName = (currentUser && currentUser.displayName) ? currentUser.displayName : (localStorage.getItem('vocaflow_user_name') || 'Khách');

    // 1. Profile Modal
    const profAv = document.getElementById('profile-avatar');
    if (profAv) {
      profAv.innerHTML = renderAvatarWithFrameHtml(userAvatar, 88, equipped.frame, 'hoverable');
      profAv.style.border = 'none';
      profAv.style.background = 'transparent';
      profAv.style.boxShadow = 'none';
    }
    const profName = document.getElementById('profile-name');
    if (profName) {
      profName.innerHTML = renderUsernameWithEffectHtml(userName, equipped.nameEffect);
    }
    const profBadge = document.getElementById('profile-badge');
    if (profBadge) {
      const activeTitle = VOCAFLOW_WARDROBE_REGISTRY.titles.find(t => t.id === equipped.title) || VOCAFLOW_WARDROBE_REGISTRY.titles[0];
      profBadge.textContent = activeTitle.tag;
      profBadge.style.background = `${activeTitle.color}25`;
      profBadge.style.color = activeTitle.color;
      profBadge.style.borderColor = `${activeTitle.color}60`;
    }

    // 2. Header Desktop & Mobile
    const headerAv = document.getElementById('user-avatar-icon');
    if (headerAv) {
      headerAv.innerHTML = renderAvatarWithFrameHtml(userAvatar, 26, equipped.frame);
    }
    const headerName = document.getElementById('user-display-name');
    if (headerName) {
      headerName.innerHTML = renderUsernameWithEffectHtml(userName, equipped.nameEffect);
    }
    const mobileAv = document.getElementById('user-avatar-icon-mobile');
    if (mobileAv) {
      mobileAv.innerHTML = renderAvatarWithFrameHtml(userAvatar, 26, equipped.frame);
    }
  }
  window.applyWardrobeToActiveUI = applyWardrobeToActiveUI;

  // 5. MODAL & TAB LOGIC
  function openWardrobeModal(defaultTab = 'frames') {
    if (typeof closeModal === 'function') {
      closeModal('modal-profile');
    }
    wardrobePreviewState = { ...getEquippedWardrobe() };
    activeWardrobeTab = defaultTab || 'frames';

    if (typeof openModal === 'function') {
      openModal('modal-wardrobe');
    } else {
      const el = document.getElementById('modal-wardrobe');
      if (el) el.classList.add('active');
    }

    renderWardrobePreview();
    switchWardrobeTab(activeWardrobeTab);
  }
  window.openWardrobeModal = openWardrobeModal;

  function switchWardrobeTab(tabName) {
    activeWardrobeTab = tabName || 'frames';
    const tabBtns = ['frames', 'nameEffects', 'titles'];
    tabBtns.forEach(t => {
      const btn = document.getElementById(`wardrobe-tab-btn-${t}`);
      if (btn) {
        if (t === activeWardrobeTab) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    renderWardrobeTabContent(activeWardrobeTab);
  }
  window.switchWardrobeTab = switchWardrobeTab;

  function renderWardrobePreview(previewOverride = null) {
    const state = previewOverride || wardrobePreviewState || getEquippedWardrobe();
    const userAvatar = (typeof getUserAvatar === 'function') ? getUserAvatar() : (currentUser?.avatar || '👤');
    const userName = (currentUser && currentUser.displayName) ? currentUser.displayName : (localStorage.getItem('vocaflow_user_name') || 'Flower VocaFlow');
    const userLvlInfo = (typeof getCurrentUserLevelInfo === 'function') ? getCurrentUserLevelInfo() : { level: 1, totalExp: 0 };

    // Update level pill
    const lvlPill = document.getElementById('wardrobe-user-level-pill');
    if (lvlPill) {
      lvlPill.textContent = userLvlInfo.isMaxLevel ? `👑 Lv.50 MAX (${userLvlInfo.totalExp.toLocaleString()} EXP)` : `⭐ Lv.${userLvlInfo.level} (${userLvlInfo.totalExp.toLocaleString()} EXP)`;
    }

    // Update avatar with frame
    const avContainer = document.getElementById('wardrobe-preview-avatar-container');
    if (avContainer) {
      avContainer.innerHTML = renderAvatarWithFrameHtml(userAvatar, 130, state.frame, 'hoverable');
    }

    // Update username with name effect
    const nameContainer = document.getElementById('wardrobe-preview-name');
    if (nameContainer) {
      nameContainer.innerHTML = renderUsernameWithEffectHtml(userName, state.nameEffect, 'hoverable');
    }

    // Update title badge
    const titleContainer = document.getElementById('wardrobe-preview-title-badge');
    if (titleContainer) {
      const activeTitle = VOCAFLOW_WARDROBE_REGISTRY.titles.find(t => t.id === state.title) || VOCAFLOW_WARDROBE_REGISTRY.titles[0];
      titleContainer.textContent = activeTitle.tag;
      titleContainer.style.background = `${activeTitle.color}25`;
      titleContainer.style.color = activeTitle.color;
      titleContainer.style.borderColor = `${activeTitle.color}60`;
    }
  }
  window.renderWardrobePreview = renderWardrobePreview;

  function renderWardrobeTabContent(tabName) {
    const container = document.getElementById('wardrobe-items-container');
    if (!container) return;

    const equipped = getEquippedWardrobe();
    const userLevel = (typeof getCurrentUserLevelInfo === 'function') ? getCurrentUserLevelInfo().level : 1;
    const items = VOCAFLOW_WARDROBE_REGISTRY[tabName] || [];
    const userAvatar = (typeof getUserAvatar === 'function') ? getUserAvatar() : (currentUser?.avatar || '👤');
    const userName = (currentUser && currentUser.displayName) ? currentUser.displayName : (localStorage.getItem('vocaflow_user_name') || 'Flower');

    const equippedItemId = equipped[tabName === 'frames' ? 'frame' : (tabName === 'nameEffects' ? 'nameEffect' : 'title')] || 'default';

    let cardsHtml = '<div class="vf-wardrobe-grid">';

    items.forEach(item => {
      const isUnlocked = userLevel >= item.minLevel;
      const isEquipped = equippedItemId === item.id;

      let previewVisual = '';
      if (tabName === 'frames') {
        previewVisual = renderAvatarWithFrameHtml(userAvatar, 72, item.id);
      } else if (tabName === 'nameEffects') {
        previewVisual = `
          <div style="padding: 14px 8px; text-align: center; background: rgba(0,0,0,0.3); border-radius: 10px; width: 100%;">
            ${renderUsernameWithEffectHtml(userName, item.id)}
          </div>
        `;
      } else if (tabName === 'titles') {
        previewVisual = `
          <div style="padding: 12px 8px; text-align: center; background: rgba(0,0,0,0.3); border-radius: 10px; width: 100%;">
            <span class="badge" style="font-size: 13px; font-weight: 800; padding: 4px 12px; border-radius: 8px; background: ${item.color}25; color: ${item.color}; border: 1.5px solid ${item.color}60;">
              ${escapeHtml(item.tag)}
            </span>
          </div>
        `;
      }

      let statusBadge = '';
      if (isEquipped) {
        statusBadge = `<span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; font-size: 10px; font-weight: 800; border: 1px solid rgba(16,185,129,0.5);">✅ Đang Trang Bị</span>`;
      } else if (isUnlocked) {
        statusBadge = `<span class="badge" style="background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 10px; font-weight: 700; border: 1px solid rgba(56,189,248,0.35);">🔓 Đã Mở Khóa</span>`;
      } else {
        statusBadge = `<span class="badge" style="background: rgba(239,68,68,0.15); color: #f87171; font-size: 10px; font-weight: 700; border: 1px solid rgba(239,68,68,0.35);">🔒 Cần Cấp ${item.minLevel}</span>`;
      }

      let actionBtn = '';
      if (isEquipped) {
        if (item.id === 'default') {
          actionBtn = `<button type="button" class="btn btn-outline btn-sm" disabled style="width: 100%; font-size: 11.5px; opacity: 0.6; cursor: default;">Mặc Định</button>`;
        } else {
          actionBtn = `<button type="button" class="btn btn-outline btn-sm" onclick="unequipWardrobeItem('${tabName}')" style="width: 100%; font-size: 11.5px; color: #f87171; border-color: rgba(248,113,113,0.4); font-weight: 700;">Tháo Ra</button>`;
        }
      } else if (isUnlocked) {
        actionBtn = `
          <div style="display: flex; gap: 6px; width: 100%;">
            <button type="button" class="btn btn-outline btn-sm" onclick="previewWardrobeItem('${tabName}', '${item.id}')" style="flex: 1; font-size: 11px; padding: 4px 6px;" title="Xem thử trên người">👁️ Thử</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="equipWardrobeItem('${tabName}', '${item.id}')" style="flex: 1.5; font-size: 11.5px; font-weight: 800; background: linear-gradient(135deg, #4f46e5, #7c3aed); border: none;">Trang Bị</button>
          </div>
        `;
      } else {
        actionBtn = `<button type="button" class="btn btn-outline btn-sm" disabled style="width: 100%; font-size: 11px; color: var(--text-muted); opacity: 0.5; cursor: not-allowed;">🔒 Mở khóa ở Lv.${item.minLevel}</button>`;
      }

      cardsHtml += `
        <div class="vf-wardrobe-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}">
          <!-- Card Top Row -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 11.5px; font-weight: 800; color: ${item.badgeColor || item.color || 'var(--text)'}; display: flex; align-items: center; gap: 4px;">
              <span>${item.icon || '🎖️'}</span> <span>${escapeHtml(item.name)}</span>
            </span>
            ${statusBadge}
          </div>

          <!-- Card Visual Preview -->
          <div style="display: flex; align-items: center; justify-content: center; min-height: 80px; margin-bottom: 10px; cursor: pointer;" onclick="previewWardrobeItem('${tabName}', '${item.id}')">
            ${previewVisual}
          </div>

          <!-- Card Description -->
          <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 12px 0; line-height: 1.4; min-height: 30px;">
            ${escapeHtml(item.desc)}
          </p>

          <!-- Card Action Button -->
          <div>
            ${actionBtn}
          </div>
        </div>
      `;
    });

    cardsHtml += '</div>';
    container.innerHTML = cardsHtml;
  }
  window.renderWardrobeTabContent = renderWardrobeTabContent;

  // Initialize upon script load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      applyWardrobeToActiveUI();
    }, 400);
  });

})();
