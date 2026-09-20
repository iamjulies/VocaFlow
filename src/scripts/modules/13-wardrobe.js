// =========================================================================
// VOCAFLOW 13-WARDROBE.JS (v0.10.10-44 Build 345)
// Hệ Thống Tủ Đồ & Cửa Hàng Thẩm Mỹ: Khung Viền Avatar, Hiệu Ứng Tên & Danh Xưng
// =========================================================================

(function() {
  'use strict';

  const STORAGE_KEY_EQUIPPED_WARDROBE = 'vocaflow_equipped_wardrobe';
  const STORAGE_KEY_UNLOCKED_WARDROBE = 'vocaflow_unlocked_wardrobe_items';

  // 1. REGISTRY TỦ ĐỒ (REGISTRY OF ALL WARDROBE ITEMS)
  // Phân loại: shop (Có thể mua), event (Sự kiện), level (Cấp bậc), vip (Đặc quyền VocaVIP)
  const VOCAFLOW_WARDROBE_REGISTRY = {
    frames: [
      // --- A. CÓ THỂ MUA (SHOP / PETS) ---
      {
        id: 'cat',
        name: 'Bé Mèo Dễ Thương',
        type: 'shop',
        price: 500,
        desc: 'Tai vểnh hồng pastel, chuông vàng leng keng và vòng bo êm dịu.',
        badge: 'Shop: 500🪙',
        badgeColor: '#ff9fb2',
        icon: '🐱'
      },
      {
        id: 'dog',
        name: 'Bé Cún Tinh Nghịch',
        type: 'shop',
        price: 500,
        desc: 'Tai cụp caramel ấm áp, khúc xương nhỏ xinh và viền nâu vàng.',
        badge: 'Shop: 500🪙',
        badgeColor: '#f5b041',
        icon: '🐶'
      },

      // --- B. SỰ KIỆN ĐẶC BIỆT (EVENT - CHỈ NHẬN Ở SỰ KIỆN, KHÔNG BÁN BẰNG XU) ---
      {
        id: 'birthday',
        name: 'Sinh Nhật Rực Rỡ',
        type: 'event',
        price: null,
        desc: 'Phần thưởng độc quyền Sự Kiện Sinh Nhật: Nón tiệc nhún nhảy, bánh cupcake thắp nến và pháo giấy cầu vồng.',
        badge: '🎁 Sự Kiện',
        badgeColor: '#ff007f',
        icon: '🎂'
      },
      {
        id: 'christmas',
        name: 'Giáng Sinh An Lành',
        type: 'event',
        price: null,
        desc: 'Phần thưởng độc quyền Lễ Giáng Sinh: Mũ Noel đỏ ấm áp, chuông vàng đung đưa và vòng thông tuyết.',
        badge: '🎁 Sự Kiện',
        badgeColor: '#22c55e',
        icon: '🎄'
      },
      {
        id: 'halloween',
        name: 'Halloween Ma Mị',
        type: 'event',
        price: null,
        desc: 'Phần thưởng độc quyền Lễ Halloween: Mũ phù thủy huyền bí, bí ngô phát sáng và cánh dơi đêm.',
        badge: '🎁 Sự Kiện',
        badgeColor: '#f97316',
        icon: '🎃'
      },
      {
        id: 'vietnam',
        name: 'Quốc Khánh Việt Nam',
        type: 'event',
        price: null,
        desc: 'Phần thưởng độc quyền Quốc Khánh 2/9: Ngôi sao vàng tỏa rạng trung tâm, hai bông lúa trĩu hạt và hoa sen hồng.',
        badge: '🎁 Sự Kiện',
        badgeColor: '#ef4444',
        icon: '⭐'
      },
      {
        id: 'tet',
        name: 'Tết Nguyên Đán',
        type: 'event',
        price: null,
        desc: 'Phần thưởng độc quyền Tết Cổ Truyền: Lồng đèn đỏ may mắn, cành mai vàng khoe sắc, bánh chưng & bao lì xì.',
        badge: '🎁 Sự Kiện',
        badgeColor: '#eab308',
        icon: '🧧'
      },
      {
        id: 'easter',
        name: 'Lễ Phục Sinh (Easter)',
        type: 'event',
        price: null,
        desc: 'Phần thưởng độc quyền Lễ Phục Sinh: Đôi tai thỏ trắng muốt xinh xắn và giỏ trứng phục sinh sắc màu.',
        badge: '🎁 Sự Kiện',
        badgeColor: '#38bdf8',
        icon: '🐰'
      },

      // --- C. ĐẶC QUYỀN VIP (VOCAVIP) ---
      {
        id: 'vip',
        name: 'Khung VocaVIP Hoàng Triều',
        type: 'vip',
        desc: 'Đặc quyền VocaVIP Hoàng Triều Vĩnh Cửu: Vương miện 3D nảy nhẹ, dải lụa hoàng gia chuyển màu và huy hiệu VIP Lifetime sang trọng.',
        badge: '👑 VocaVIP',
        badgeColor: '#ffd700',
        icon: '👑'
      },

      // --- D. CẤP BẬC RÈN LUYỆN (LEVEL - ĐẨY XUỐNG CUỐI) ---
      {
        id: 'default',
        name: 'Khung Mặc Định',
        type: 'level',
        minLevel: 1,
        desc: 'Viền tròn thanh lịch cơ bản của mọi Flower.',
        badge: 'Mặc định',
        badgeColor: '#10b981',
        icon: '⚪'
      },
      {
        id: 'bronze',
        name: 'Khung Đồng Sơ Cấp',
        type: 'level',
        minLevel: 10,
        desc: 'Huy hiệu sao đồng & đinh tán cổ phong chạm khắc.',
        badge: 'Cấp 10+',
        badgeColor: '#cd7f32',
        icon: '🥉'
      },
      {
        id: 'silver',
        name: 'Khung Bạc Tinh Xảo',
        type: 'level',
        minLevel: 20,
        desc: 'Cánh chim bạch kim & huy hiệu 2 Ngôi sao xếp hạng (★ ★).',
        badge: 'Cấp 20+',
        badgeColor: '#e0e0e0',
        icon: '🥈'
      },
      {
        id: 'gold',
        name: 'Khung Vàng Hoàng Gia',
        type: 'level',
        minLevel: 30,
        desc: 'Vương miện hoàng kim 12h & huy hiệu 3 Ngôi sao tinh tú (★ ★ ★).',
        badge: 'Cấp 30+',
        badgeColor: '#ffd700',
        icon: '🥇'
      },
      {
        id: 'diamond',
        name: 'Khung Lam Ngọc',
        type: 'level',
        minLevel: 40,
        desc: 'Giác cắt kim cương 3D, huy hiệu Kim Cương 4 Sao (💎 ★ ★ ★ ★) & ánh sáng Lam Ngọc lấp lánh.',
        badge: 'Cấp 40+',
        badgeColor: '#00e5ff',
        icon: '💎'
      },
      {
        id: 'mythic',
        name: 'Rồng Hồng Thần Thoại',
        type: 'level',
        minLevel: 50,
        desc: 'Rồng hồng thần thoại quấn quanh, cánh dơi & khè lửa plasma.',
        badge: 'Cấp 50 MAX',
        badgeColor: '#ff007f',
        icon: '🐉'
      }
    ],

    nameEffects: [
      // --- A. CÓ THỂ MUA (SHOP / PETS) ---
      {
        id: 'cat',
        name: 'Tên Bé Mèo Pastel',
        type: 'shop',
        price: 400,
        desc: 'Hồng phấn pastel ngọt ngào, đốm sáng vuốt mèo & tai mèo xinh.',
        badge: 'Shop: 400🪙',
        badgeColor: '#ff9fb2',
        icon: '🐾'
      },
      {
        id: 'dog',
        name: 'Tên Bé Cún Năng Động',
        type: 'shop',
        price: 400,
        desc: 'Caramel ấm áp, khúc xương nhỏ & vệt sáng cún tinh nghịch.',
        badge: 'Shop: 400🪙',
        badgeColor: '#f5b041',
        icon: '🦴'
      },

      // --- B. SỰ KIỆN ĐẶC BIỆT (EVENT) ---
      {
        id: 'birthday',
        name: 'Tên Tiệc Sinh Nhật',
        type: 'event',
        price: 600,
        desc: 'Gradient đa sắc tiệc tùng, pháo bông & confetti bay bổng.',
        badge: 'Sự Kiện: 600🪙',
        badgeColor: '#ff007f',
        icon: '🎉'
      },
      {
        id: 'christmas',
        name: 'Tên Giáng Sinh Tuyết Rơi',
        type: 'event',
        price: 600,
        desc: 'Xanh thông tuyết trắng, đỏ kẹo ngọt & chuông vàng Noel.',
        badge: 'Sự Kiện: 600🪙',
        badgeColor: '#22c55e',
        icon: '❄️'
      },
      {
        id: 'halloween',
        name: 'Tên Halloween Ma Quái',
        type: 'event',
        price: 600,
        desc: 'Cam bí ngô rực lửa, tím bóng đêm & hào quang huyền bí.',
        badge: 'Sự Kiện: 600🪙',
        badgeColor: '#f97316',
        icon: '👻'
      },
      {
        id: 'vietnam',
        name: 'Tên Tự Hào Việt Nam',
        type: 'event',
        price: 600,
        desc: 'Đỏ cờ Tổ quốc thắm tươi, sao vàng hoàng kim & hào quang rạng rỡ.',
        badge: 'Sự Kiện: 600🪙',
        badgeColor: '#ef4444',
        icon: '🇻🇳'
      },
      {
        id: 'tet',
        name: 'Tên Khai Xuân Đắc Lộc',
        type: 'event',
        price: 600,
        desc: 'Đỏ kim tiền may mắn, hoa mai vàng khoe sắc & pháo hoa chúc phúc.',
        badge: 'Sự Kiện: 600🪙',
        badgeColor: '#eab308',
        icon: '🌸'
      },
      {
        id: 'easter',
        name: 'Tên Phục Sinh Sắc Xuân',
        type: 'event',
        price: 600,
        desc: 'Pastel mùa xuân dịu dàng, tai thỏ trắng muốt & trứng sắc màu.',
        badge: 'Sự Kiện: 600🪙',
        badgeColor: '#c084fc',
        icon: '🥚'
      },

      // --- C. ĐẶC QUYỀN VIP (VOCAVIP) ---
      {
        id: 'vip',
        name: 'Tên VocaVIP Quý Tộc',
        type: 'vip',
        desc: 'Đặc quyền VocaVIP: Dải màu kim loại hoàng kim chuyển động, vương miện đung đưa & hào quang quý tộc.',
        badge: '👑 VocaVIP',
        badgeColor: '#ffd700',
        icon: '👑'
      },

      // --- D. CẤP BẬC RÈN LUYỆN (LEVEL - ĐẨY XUỐNG CUỐI) ---
      {
        id: 'default',
        name: 'Tên Mặc Định',
        type: 'level',
        minLevel: 1,
        desc: 'Chữ tiêu chuẩn sắc nét nguyên bản.',
        badge: 'Mặc định',
        badgeColor: '#10b981',
        icon: '📝'
      },
      {
        id: 'bronze',
        name: 'Tên Đồng Sơ Cấp',
        type: 'level',
        minLevel: 10,
        desc: 'Ánh đồng trầm ấm cổ điển, text-shadow ấm áp.',
        badge: 'Cấp 10+',
        badgeColor: '#cd7f32',
        icon: '🥉'
      },
      {
        id: 'silver',
        name: 'Tên Bạc Tinh Xảo',
        type: 'level',
        minLevel: 20,
        desc: 'Ánh kim bạch kim phát sáng huyền ảo khi rê chuột.',
        badge: 'Cấp 20+',
        badgeColor: '#e0e0e0',
        icon: '🥈'
      },
      {
        id: 'gold',
        name: 'Tên Vàng Hoàng Gia',
        type: 'level',
        minLevel: 30,
        desc: 'Gradient hoàng kim quét động & lấp lánh Blink Blink (✨).',
        badge: 'Cấp 30+',
        badgeColor: '#ffd700',
        icon: '🥇'
      },
      {
        id: 'diamond',
        name: 'Tên Lam Ngọc',
        type: 'level',
        minLevel: 40,
        desc: 'Neon xanh băng, tia phản quang & đốm sáng kim cương.',
        badge: 'Cấp 40+',
        badgeColor: '#00e5ff',
        icon: '💎'
      },
      {
        id: 'mythic',
        name: 'Tên Thần Thoại Conic',
        type: 'level',
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
        id: 'vip',
        name: 'VocaVIP Flower',
        tag: '👑 VocaVIP Flower',
        type: 'vip',
        desc: 'Đặc quyền VocaVIP - Hội viên danh dự tối cao của VocaFlow.',
        badge: '👑 VocaVIP',
        color: '#ffd700'
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
        desc: 'Chạm mốc Cấp 20 - Vốn từ phong phú vững vàng.',
        badge: 'Cấp 20+',
        color: '#38bdf8'
      },
      {
        id: 'lv30',
        name: 'Chuyên Gia',
        tag: '🔥 Chuyên Gia',
        minLevel: 30,
        desc: 'Chạm mốc Cấp 30 - Nắm trọn phản xạ từ vựng đỉnh cao.',
        badge: 'Cấp 30+',
        color: '#ef4444'
      },
      {
        id: 'lv40',
        name: 'Bậc Thầy',
        tag: '👑 Bậc Thầy',
        minLevel: 40,
        desc: 'Chạm mốc Cấp 40 - Đẳng cấp rèn luyện xuất sắc.',
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
  let activeWardrobeFilter = 'all';
  let wardrobePreviewState = null;

  // 2. STATE STORAGE & RETRIEVAL (EQUIPPED & UNLOCKED)
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

  // Unlocked items repository (for shop/event purchases)
  function getUnlockedWardrobeItems() {
    let unlocked = { frames: ['default'], nameEffects: ['default'], titles: ['default'] };
    try {
      if (typeof currentUser !== 'undefined' && currentUser && currentUser.unlockedWardrobeItems && typeof currentUser.unlockedWardrobeItems === 'object') {
        unlocked = {
          frames: Array.from(new Set(['default', ...(currentUser.unlockedWardrobeItems.frames || [])])),
          nameEffects: Array.from(new Set(['default', ...(currentUser.unlockedWardrobeItems.nameEffects || [])])),
          titles: Array.from(new Set(['default', ...(currentUser.unlockedWardrobeItems.titles || [])]))
        };
      } else {
        const raw = localStorage.getItem(STORAGE_KEY_UNLOCKED_WARDROBE);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            unlocked = {
              frames: Array.from(new Set(['default', ...(parsed.frames || [])])),
              nameEffects: Array.from(new Set(['default', ...(parsed.nameEffects || [])])),
              titles: Array.from(new Set(['default', ...(parsed.titles || [])]))
            };
          }
        }
      }
    } catch (e) {
      console.warn('Error reading unlocked wardrobe items:', e);
    }
    return unlocked;
  }
  window.getUnlockedWardrobeItems = getUnlockedWardrobeItems;

  function unlockWardrobeItem(category, itemId) {
    if (!itemId) return;
    const current = getUnlockedWardrobeItems();
    if (!current[category]) current[category] = ['default'];
    if (!current[category].includes(itemId)) {
      current[category].push(itemId);
    }
    localStorage.setItem(STORAGE_KEY_UNLOCKED_WARDROBE, JSON.stringify(current));
    if (typeof currentUser !== 'undefined' && currentUser) {
      currentUser.unlockedWardrobeItems = current;
      localStorage.setItem('vocaflow_auth_user', JSON.stringify(currentUser));
    }
    if (typeof pushCurrentDatabaseToCloud === 'function') {
      pushCurrentDatabaseToCloud();
    }
  }
  window.unlockWardrobeItem = unlockWardrobeItem;

  function isWardrobeItemUnlocked(category, itemId) {
    if (!itemId || itemId === 'default') return true;
    const list = VOCAFLOW_WARDROBE_REGISTRY[category] || [];
    const item = list.find(i => i.id === itemId);
    if (!item) return false;

    // 1. VIP-exclusive unlock
    if (item.type === 'vip') {
      return (typeof isUserVip === 'function' && isUserVip());
    }

    // 2. Level-based unlock
    if (item.type === 'level' || (item.minLevel && !item.price)) {
      const userLevel = (typeof getCurrentUserLevelInfo === 'function') ? getCurrentUserLevelInfo().level : 1;
      return userLevel >= (item.minLevel || 1);
    }

    // 3. Shop / Event unlock (by purchase or event claim)
    const unlocked = getUnlockedWardrobeItems();
    return (unlocked[category] || []).includes(itemId);
  }
  window.isWardrobeItemUnlocked = isWardrobeItemUnlocked;

  function buyWardrobeItem(category, itemId, skipConfirm = false) {
    const list = VOCAFLOW_WARDROBE_REGISTRY[category] || [];
    const item = list.find(i => i.id === itemId);
    if (!item) return { success: false, reason: 'ITEM_NOT_FOUND' };

    if (item.type === 'event') {
      if (typeof showToast === 'function') {
        showToast('🎁 Vật phẩm này là phần thưởng độc quyền chỉ nhận được khi tham gia Sự Kiện & Lễ Hội!');
      }
      return { success: false, reason: 'EVENT_EXCLUSIVE' };
    }

    if (item.type === 'vip') {
      if (typeof openModal === 'function') openModal('modal-vip-upgrade');
      return { success: false, reason: 'VIP_EXCLUSIVE' };
    }

    if (isWardrobeItemUnlocked(category, itemId)) {
      equipWardrobeItem(category, itemId);
      return { success: true, alreadyUnlocked: true };
    }

    const price = item.price || 0;
    const userPoints = (typeof getUserPoints === 'function') ? getUserPoints() : 0;

    if (userPoints < price) {
      if (typeof playSfx === 'function') playSfx('wrong');
      if (typeof showToast === 'function') {
        showToast(`⚠️ Bạn không đủ VoCoin! Cần ${price.toLocaleString()} VoCoin (hiện có ${userPoints.toLocaleString()} VoCoin). Hãy học tập hoặc quay vòng quay may mắn!`);
      }
      return { success: false, reason: 'INSUFFICIENT_FUNDS' };
    }

    if (!skipConfirm && typeof confirm === 'function' && !confirm(`Bạn có muốn dùng ${price.toLocaleString()} VoCoin để mua "${item.name}" không?`)) {
      return { success: false, reason: 'CANCELLED' };
    }

    // Deduct VoCoin
    const newPoints = userPoints - price;
    if (typeof setUserPoints === 'function') {
      setUserPoints(newPoints);
    }
    if (typeof addLedgerEntry === 'function') {
      addLedgerEntry('WARDROBE_PURCHASE', -price, `Mua vật phẩm [${item.name}] trong Tủ Đồ Thẩm Mỹ`);
    }

    // Unlock item
    unlockWardrobeItem(category, itemId);

    // Play celebration SFX
    if (typeof playSfx === 'function') playSfx('award');
    if (typeof showToast === 'function') {
      showToast(`🎉 Chúc mừng bạn đã sở hữu thành công: ${item.name}!`);
    }

    // Equip immediately
    equipWardrobeItem(category, itemId);
    updateWardrobePointsDisplay();
    return { success: true, item, newPoints };
  }
  window.buyWardrobeItem = buyWardrobeItem;

  function equipWardrobeItem(category, itemId) {
    if (!isWardrobeItemUnlocked(category, itemId)) {
      const item = (VOCAFLOW_WARDROBE_REGISTRY[category] || []).find(i => i.id === itemId);
      if (item && item.type === 'vip') {
        if (typeof openModal === 'function') openModal('modal-vip-upgrade');
        return;
      }
      if (item && item.type === 'event') {
        if (typeof showToast === 'function') {
          showToast('🎁 Vật phẩm này là phần thưởng độc quyền chỉ nhận được khi tham gia Sự Kiện & Lễ Hội!');
        }
        return;
      }
      if (item && item.price) {
        buyWardrobeItem(category, itemId);
      } else {
        if (typeof showToast === 'function') {
          showToast(`🔒 Cần đạt Cấp độ ${item ? item.minLevel : 10} để trang bị vật phẩm này!`);
        }
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

  // 3. UNIVERSAL SVG & DOM RENDERING HELPERS
  function renderAvatarWithFrameHtml(avatarVal, size = 64, frameId = null, extraClasses = '') {
    const fId = frameId || getEquippedWardrobe().frame || 'default';
    const innerSize = Math.round(size * 0.68);
    const avHtml = (typeof renderAvatarHtml === 'function')
      ? renderAvatarHtml(avatarVal, innerSize, Math.round(innerSize * 0.45))
      : `<span style="font-size:${Math.round(innerSize*0.45)}px;">👤</span>`;

    let overlaySvg = '';

    if (fId === 'cat') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 160 160" fill="none" style="filter: drop-shadow(0 2px 8px rgba(255, 159, 178, 0.45));">
          <!-- Vòng bo viền tròn hồng phấn pastel -->
          <circle cx="80" cy="80" r="54" stroke="#ff9fb2" stroke-width="4.5" />
          <circle cx="80" cy="80" r="50" stroke="#ffd1dc" stroke-width="1.5" opacity="0.6" />
          <!-- Tai Mèo Trái -->
          <g class="cat-ear-left">
            <polygon points="32,58 42,22 62,44" fill="#ff9fb2" stroke="#ff758f" stroke-width="2.2" stroke-linejoin="round" />
            <polygon points="37,53 44,30 57,45" fill="#ffe0e6" />
          </g>
          <!-- Tai Mèo Phải -->
          <g class="cat-ear-right">
            <polygon points="128,58 118,22 98,44" fill="#ff9fb2" stroke="#ff758f" stroke-width="2.2" stroke-linejoin="round" />
            <polygon points="123,53 116,30 103,45" fill="#ffe0e6" />
          </g>
          <!-- Chuông nhỏ vàng dễ thương ở đáy -->
          <g transform="translate(80, 138)">
            <ellipse cx="0" cy="-2" rx="12" ry="4.5" fill="#ff758f" />
            <circle cx="0" cy="2" r="7.5" fill="#facc15" stroke="#eab308" stroke-width="1.4" />
            <line x1="-4" y1="3" x2="4" y2="3" stroke="#ca8a04" stroke-width="1.2" />
            <circle cx="0" cy="5" r="1.4" fill="#854d0e" />
          </g>
        </svg>
      `;
    } else if (fId === 'dog') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 160 160" fill="none" style="filter: drop-shadow(0 2px 8px rgba(245, 176, 65, 0.45));">
          <!-- Vòng bo viền tròn caramel -->
          <circle cx="80" cy="80" r="54" stroke="#f5b041" stroke-width="4.5" />
          <circle cx="80" cy="80" r="50" stroke="#fdebd0" stroke-width="1.5" opacity="0.5" />
          <!-- Tai Cún Cụp Bên Trái -->
          <g class="dog-ear-left">
            <path d="M 38,36 C 28,38 20,52 21,70 C 22,82 33,85 38,78 C 44,68 47,48 42,37 Z" fill="#d35400" stroke="#ba4a00" stroke-width="2" stroke-linejoin="round" />
            <path d="M 34,44 C 29,51 27,62 29,72 C 31,76 35,76 37,70 C 40,63 41,50 37,45 Z" fill="#e59866" opacity="0.6" />
          </g>
          <!-- Tai Cún Cụp Bên Phải -->
          <g class="dog-ear-right">
            <path d="M 122,36 C 132,38 140,52 139,70 C 138,82 127,85 122,78 C 116,68 113,48 118,37 Z" fill="#d35400" stroke="#ba4a00" stroke-width="2" stroke-linejoin="round" />
            <path d="M 126,44 C 131,51 133,62 131,72 C 129,76 125,76 123,70 C 120,63 119,50 123,45 Z" fill="#e59866" opacity="0.6" />
          </g>
          <!-- Khúc xương nhỏ xinh ở đáy -->
          <g transform="translate(80, 138)">
            <rect x="-9" y="-4" width="18" height="8" rx="4" fill="#fdfefe" stroke="#e5e7eb" stroke-width="1" />
            <circle cx="-9" cy="-4" r="3.2" fill="#fdfefe" stroke="#e5e7eb" stroke-width="0.8" />
            <circle cx="-9" cy="4" r="3.2" fill="#fdfefe" stroke="#e5e7eb" stroke-width="0.8" />
            <circle cx="9" cy="-4" r="3.2" fill="#fdfefe" stroke="#e5e7eb" stroke-width="0.8" />
            <circle cx="9" cy="4" r="3.2" fill="#fdfefe" stroke="#e5e7eb" stroke-width="0.8" />
          </g>
        </svg>
      `;
    } else if (fId === 'birthday') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 160 160" fill="none" style="filter: drop-shadow(0 2px 10px rgba(255, 0, 127, 0.4));">
          <defs>
            <linearGradient id="bdayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff007f" /><stop offset="35%" stop-color="#a855f7" /><stop offset="70%" stop-color="#06b6d4" /><stop offset="100%" stop-color="#facc15" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="54" stroke="url(#bdayGrad)" stroke-width="4.8" stroke-linecap="round" />
          <circle cx="80" cy="80" r="50" stroke="#ffffff" stroke-width="1.2" opacity="0.4" stroke-dasharray="4 8" />
          <!-- Nón sinh nhật chóp nhọn 12h (nhún nhảy lên xuống nhẹ nhàng) -->
          <g transform="translate(80, 24)">
            <g class="bday-hat">
              <path d="M 0,-18 L -18,14 Q 0,20 18,14 Z" fill="#ff007f" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M -5,-7 L -14,8" stroke="#facc15" stroke-width="2.2" stroke-linecap="round" />
              <path d="M 0,-3 L -4,15" stroke="#06b6d4" stroke-width="2.2" stroke-linecap="round" />
              <path d="M 5,1 L 6,16" stroke="#a855f7" stroke-width="2.2" stroke-linecap="round" />
              <circle cx="0" cy="-18" r="4.5" fill="#facc15" stroke="#ffffff" stroke-width="1" />
              <ellipse cx="0" cy="14" rx="19" ry="4" fill="#ffffff" />
            </g>
          </g>
          <!-- Bánh cupcake ngọt ngào ở 6h -->
          <g transform="translate(80, 136)">
            <polygon points="-11,5 -8,15 8,15 11,5" fill="#f59e0b" stroke="#78350f" stroke-width="0.8" />
            <ellipse cx="0" cy="4" rx="13" ry="5" fill="#f43f5e" />
            <ellipse cx="0" cy="1" rx="10" ry="4" fill="#fb7185" />
            <ellipse cx="0" cy="-2" rx="6" ry="3" fill="#ffffff" />
            <rect x="-1" y="-8" width="2" height="6" fill="#38bdf8" />
            <path d="M 0,-8 Q -2,-11 0,-14 Q 2,-11 0,-8 Z" fill="#facc15" />
          </g>
          <circle class="bday-star-pulse" cx="125" cy="40" r="3" fill="#06b6d4" />
          <circle class="bday-star-pulse" cx="35" cy="120" r="2.5" fill="#38bdf8" />
        </svg>
      `;
    } else if (fId === 'christmas') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 160 160" fill="none" style="filter: drop-shadow(0 2px 10px rgba(34, 197, 94, 0.4));">
          <defs>
            <linearGradient id="xmasPineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#15803d" /><stop offset="50%" stop-color="#22c55e" /><stop offset="100%" stop-color="#166534" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="54" stroke="url(#xmasPineGrad)" stroke-width="5.5" stroke-linecap="round" />
          <circle cx="80" cy="80" r="50" stroke="#fef08a" stroke-width="1.5" stroke-dasharray="3 7" opacity="0.8" />
          <circle cx="34" cy="60" r="4" fill="#dc2626" stroke="#ffffff" stroke-width="0.8" />
          <circle cx="126" cy="62" r="4" fill="#eab308" stroke="#ffffff" stroke-width="0.8" />
          <!-- Mũ Noel ở 12h -->
          <g transform="translate(80, 36)">
            <g class="xmas-hat">
              <path d="M -28,2 C -30,-20 15,-26 35,-8 C 34,-1 26,2 18,2 Z" fill="#dc2626" stroke="#991b1b" stroke-width="1" />
              <circle cx="38" cy="-6" r="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
              <rect x="-30" y="-2" width="56" height="10" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
            </g>
          </g>
          <!-- Chuông vàng & nơ đỏ Noel ở 6h (lắc nhẹ tại chỗ) -->
          <g transform="translate(80, 134)">
            <g class="xmas-bell">
              <ellipse cx="-7" cy="-7" rx="6" ry="3" fill="#dc2626" transform="rotate(-25, -7, -7)" />
              <ellipse cx="7" cy="-7" rx="6" ry="3" fill="#dc2626" transform="rotate(25, 7, -7)" />
              <circle cx="0" cy="-7" r="3" fill="#991b1b" />
              <path d="M -5,-5 C -5,0 -9,6 -10,9 L 0,9 C -1,6 -5,0 -5,-5 Z" fill="#eab308" stroke="#ca8a04" stroke-width="0.8" />
              <path d="M 5,-5 C 5,0 1,6 0,9 L 10,9 C 9,6 5,0 5,-5 Z" fill="#facc15" stroke="#ca8a04" stroke-width="0.8" />
            </g>
          </g>
        </svg>
      `;
    } else if (fId === 'halloween') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 160 160" fill="none" style="filter: drop-shadow(0 2px 10px rgba(249, 115, 22, 0.45));">
          <defs>
            <linearGradient id="hwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f97316" /><stop offset="50%" stop-color="#7c3aed" /><stop offset="100%" stop-color="#ea580c" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="54" stroke="url(#hwGrad)" stroke-width="4.8" />
          <!-- Dơi đêm góc 9h -->
          <g transform="translate(26, 42)">
            <g class="spooky-bat">
              <path d="M 0,3 Q -8,-6 -14,-3 Q -10,6 0,8 Q 10,6 14,-3 Q 8,-6 0,3 Z" fill="#1e1b4b" stroke="#a855f7" stroke-width="0.8" />
              <circle cx="-1.5" cy="3" r="0.8" fill="#f97316" /><circle cx="1.5" cy="3" r="0.8" fill="#f97316" />
            </g>
          </g>
          <!-- Mũ phù thủy ở đỉnh -->
          <g transform="translate(68, 26) rotate(-14)">
            <path d="M 0,-18 Q 4,-4 14,8 L -14,8 Q -6,-4 0,-18 Z" fill="#2e1065" stroke="#7c3aed" stroke-width="1.2" />
            <path d="M -12,4 L 12,4 L 13,8 L -13,8 Z" fill="#ea580c" />
            <ellipse cx="0" cy="9" rx="20" ry="4.5" fill="#1e1b4b" stroke="#7c3aed" stroke-width="1" />
          </g>
          <!-- Quả bí ngô phát sáng ở 5h -->
          <g transform="translate(122, 122)">
            <g class="spooky-pumpkin">
              <path d="M 0,-10 Q 3,-14 5,-13 L 3,-9 Z" fill="#15803d" />
              <ellipse cx="0" cy="1" rx="8.5" ry="10.5" fill="#f97316" stroke="#c2410c" stroke-width="0.8" />
              <polygon points="-4,-2 -1,-2 -2.5,-5" fill="#fef08a" />
              <polygon points="4,-2 1,-2 2.5,-5" fill="#fef08a" />
              <path d="M -4,4 L -2,6 L 0,4 L 2,6 L 4,4 Q 0,8 -4,4 Z" fill="#fef08a" />
            </g>
          </g>
        </svg>
      `;
    } else if (fId === 'vietnam') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 160 160" fill="none" style="filter: drop-shadow(0 2px 10px rgba(239, 68, 68, 0.5));">
          <defs>
            <linearGradient id="vnRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ef4444" /><stop offset="50%" stop-color="#b91c1c" /><stop offset="100%" stop-color="#dc2626" />
            </linearGradient>
            <linearGradient id="goldStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="30%" stop-color="#fde047" /><stop offset="100%" stop-color="#eab308" />
            </linearGradient>
            <linearGradient id="riceGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fffbeb" /><stop offset="35%" stop-color="#fde047" /><stop offset="100%" stop-color="#d97706" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="54" stroke="url(#vnRedGrad)" stroke-width="5" />
          <circle cx="80" cy="80" r="50" stroke="#fbbf24" stroke-width="1.5" />
          <!-- Bông lúa vàng bên trái -->
          <g class="vn-rice-left">
            <path d="M 52,126 C 36,112 24,92 24,68 C 24,54 18,46 12,54" stroke="#d97706" stroke-width="1.3" fill="none" />
            <g transform="translate(35, 104) rotate(-50)"><path d="M 0,-4.2 C 2.4,-2.8 2.4,2.8 0,4.2 C -2.4,2.8 -2.4,-2.8 0,-4.2 Z" fill="url(#riceGoldGrad)" /></g>
            <g transform="translate(27, 91) rotate(-65)"><path d="M 0,-4.2 C 2.4,-2.8 2.4,2.8 0,4.2 C -2.4,2.8 -2.4,-2.8 0,-4.2 Z" fill="url(#riceGoldGrad)" /></g>
            <g transform="translate(21, 77) rotate(-78)"><path d="M 0,-4.2 C 2.4,-2.8 2.4,2.8 0,4.2 C -2.4,2.8 -2.4,-2.8 0,-4.2 Z" fill="url(#riceGoldGrad)" /></g>
            <g transform="translate(19, 53) rotate(-115)"><path d="M 0,-4 C 2.3,-2.7 2.3,2.7 0,4 C -2.3,2.7 -2.3,-2.7 0,-4 Z" fill="url(#riceGoldGrad)" /></g>
          </g>
          <!-- Bông lúa vàng bên phải -->
          <g class="vn-rice-right">
            <path d="M 108,126 C 124,112 136,92 136,68 C 136,54 142,46 148,54" stroke="#d97706" stroke-width="1.3" fill="none" />
            <g transform="translate(125, 104) rotate(50)"><path d="M 0,-4.2 C 2.4,-2.8 2.4,2.8 0,4.2 C -2.4,2.8 -2.4,-2.8 0,-4.2 Z" fill="url(#riceGoldGrad)" /></g>
            <g transform="translate(133, 91) rotate(65)"><path d="M 0,-4.2 C 2.4,-2.8 2.4,2.8 0,4.2 C -2.4,2.8 -2.4,-2.8 0,-4.2 Z" fill="url(#riceGoldGrad)" /></g>
            <g transform="translate(139, 77) rotate(78)"><path d="M 0,-4.2 C 2.4,-2.8 2.4,2.8 0,4.2 C -2.4,2.8 -2.4,-2.8 0,-4.2 Z" fill="url(#riceGoldGrad)" /></g>
            <g transform="translate(141, 53) rotate(115)"><path d="M 0,-4 C 2.3,-2.7 2.3,2.7 0,4 C -2.3,2.7 -2.3,-2.7 0,-4 Z" fill="url(#riceGoldGrad)" /></g>
          </g>
          <!-- Ngôi sao vàng ở 12h (phóng to tỏa rạng từ đúng tâm tròn) -->
          <g transform="translate(80, 24)">
            <g class="vn-star">
              <circle cx="0" cy="0" r="14" fill="#b91c1c" stroke="#facc15" stroke-width="1.8" />
              <polygon points="0,-10 3,-3 10,-3 4.5,1.5 6.5,8.5 0,4.5 -6.5,8.5 -4.5,1.5 -10,-3 -3,-3" fill="url(#goldStarGrad)" />
            </g>
          </g>
          <!-- Hoa sen hồng ở 6h -->
          <g transform="translate(80, 136)">
            <path d="M -26,-4 Q 0,-8 26,-4 L 22,4 Q 0,0 -22,4 Z" fill="#dc2626" stroke="#facc15" stroke-width="1" />
            <path d="M 0,-15 C -4,-10 -3,-3 0,2 C 3,-3 4,-10 0,-15 Z" fill="#fbcfe8" stroke="#ec4899" stroke-width="0.8" />
          </g>
        </svg>
      `;
    } else if (fId === 'tet') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 160 160" fill="none" style="filter: drop-shadow(0 2px 10px rgba(234, 179, 8, 0.45));">
          <defs>
            <linearGradient id="tetGoldRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#e11d48" /><stop offset="40%" stop-color="#f59e0b" /><stop offset="100%" stop-color="#eab308" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="54" stroke="url(#tetGoldRed)" stroke-width="4.8" />
          <circle cx="80" cy="80" r="50" stroke="#fef08a" stroke-width="1.2" opacity="0.6" stroke-dasharray="3 7" />
          <!-- Lồng đèn đỏ ở 10h (đung đưa nhẹ nhàng) -->
          <g transform="translate(32, 26)">
            <g class="tet-lantern">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#facc15" stroke-width="1.2" />
              <ellipse cx="0" cy="19" rx="8" ry="8" fill="#dc2626" stroke="#991b1b" stroke-width="0.8" />
              <line x1="0" y1="27" x2="0" y2="38" stroke="#f59e0b" stroke-width="1.2" />
            </g>
          </g>
          <!-- Cành mai vàng ở 2h (xoay nhẹ nhàng) -->
          <g transform="translate(126, 42)">
            <g class="tet-blossom">
              <circle cx="-5" cy="-4" r="3.5" fill="#facc15" /><circle cx="5" cy="-4" r="3.5" fill="#facc15" />
              <circle cx="-5" cy="3" r="3.5" fill="#facc15" /><circle cx="5" cy="3" r="3.5" fill="#facc15" />
              <circle cx="0" cy="0" r="2.2" fill="#ea580c" />
            </g>
          </g>
          <!-- Bánh chưng & bao lì xì ở 6h -->
          <g transform="translate(80, 134)">
            <rect x="2" y="-10" width="16" height="20" rx="2" fill="#dc2626" stroke="#facc15" stroke-width="1" transform="rotate(15, 10, 0)" />
            <rect x="-17" y="-8" width="18" height="18" rx="2" fill="#15803d" stroke="#166534" stroke-width="1" transform="rotate(-8, -8, 1)" />
            <circle cx="0" cy="5" r="4.5" fill="#facc15" stroke="#b45309" stroke-width="0.8" />
          </g>
        </svg>
      `;
    } else if (fId === 'easter') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 160 160" fill="none" style="filter: drop-shadow(0 2px 10px rgba(56, 189, 248, 0.45));">
          <defs>
            <linearGradient id="easterPastelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" /><stop offset="35%" stop-color="#c084fc" /><stop offset="70%" stop-color="#f472b6" /><stop offset="100%" stop-color="#4ade80" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="54" stroke="url(#easterPastelGrad)" stroke-width="4.5" />
          <!-- Đôi tai thỏ ở đỉnh -->
          <g class="easter-ear-left">
            <path d="M 46,38 C 38,10 50,4 56,8 C 64,13 62,30 58,38 Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.2" />
            <path d="M 49,34 C 44,15 50,11 54,14 C 59,18 57,28 55,34 Z" fill="#fbcfe8" />
          </g>
          <g class="easter-ear-right">
            <path d="M 102,38 C 98,30 96,13 104,8 C 110,4 122,10 114,38 Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.2" />
            <path d="M 105,34 C 103,28 101,18 106,14 C 110,11 116,15 111,34 Z" fill="#fbcfe8" />
            <circle cx="98" cy="38" r="3" fill="#facc15" />
          </g>
          <!-- Trứng phục sinh ở 6h -->
          <g transform="translate(80, 134)">
            <path d="M -22,10 L -18,0 L -14,10 L 14,10 L 18,0 L 22,10 Z" fill="#4ade80" />
            <ellipse cx="-12" cy="2" rx="6" ry="8" fill="#f472b6" stroke="#db2777" stroke-width="0.8" transform="rotate(-15, -12, 2)" />
            <ellipse cx="12" cy="2" rx="6" ry="8" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8" transform="rotate(15, 12, 2)" />
            <ellipse cx="0" cy="0" rx="7" ry="9" fill="#c084fc" stroke="#9333ea" stroke-width="0.8" />
          </g>
        </svg>
      `;
    } else if (fId === 'bronze') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 2px 8px rgba(205, 127, 50, 0.4));">
          <defs>
            <linearGradient id="vfBronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f5b041" /><stop offset="25%" stop-color="#ba4a00" /><stop offset="50%" stop-color="#f8c471" /><stop offset="75%" stop-color="#7e380e" /><stop offset="100%" stop-color="#e59866" />
            </linearGradient>
            <linearGradient id="vfBronzeStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff2a8" /><stop offset="50%" stop-color="#f39c12" /><stop offset="100%" stop-color="#a04000" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="236" fill="none" stroke="url(#vfBronzeGrad)" stroke-width="26" />
          <circle cx="300" cy="300" r="252" fill="none" stroke="#f8c471" stroke-width="4" opacity="0.8" />
          <g fill="#fbeee6" stroke="#4a2108" stroke-width="2">
            <circle cx="300" cy="54" r="7" /><circle cx="474" cy="126" r="7" /><circle cx="546" cy="300" r="7" /><circle cx="474" cy="474" r="7" />
            <circle cx="300" cy="546" r="7" /><circle cx="126" cy="474" r="7" /><circle cx="54" cy="300" r="7" /><circle cx="126" cy="126" r="7" />
          </g>
          <g transform="translate(300, 542)">
            <circle cx="0" cy="0" r="38" fill="url(#vfBronzeGrad)" stroke="#4a2108" stroke-width="3" />
            <circle cx="0" cy="0" r="30" fill="#2b1408" />
            <polygon points="0,-18 5,-4 19,-4 8,4 12,18 0,9 -12,18 -8,4 -19,-4 -5,-4" fill="url(#vfBronzeStarGrad)" />
          </g>
        </svg>
      `;
    } else if (fId === 'silver') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 0 12px rgba(224, 224, 224, 0.45));">
          <defs>
            <linearGradient id="vfSilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="25%" stop-color="#cfd8dc" /><stop offset="50%" stop-color="#ffffff" /><stop offset="75%" stop-color="#90a4ae" /><stop offset="100%" stop-color="#eceff1" />
            </linearGradient>
            <linearGradient id="vfSilverGem" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#e0f7fa" /><stop offset="50%" stop-color="#00e5ff" /><stop offset="100%" stop-color="#006064" />
            </linearGradient>
            <linearGradient id="vfSilverBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="100%" stop-color="#78909c" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="236" fill="none" stroke="url(#vfSilverGrad)" stroke-width="24" />
          <circle cx="300" cy="300" r="252" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="16 16" opacity="0.8" />
          <g transform="translate(110, 220)">
            <path d="M 0,0 C -40,-40 -60,-10 -90,10 C -60,20 -30,10 0,0 Z" fill="url(#vfSilverGrad)" stroke="#37474f" stroke-width="2" />
            <path d="M 0,25 C -35,-10 -50,15 -75,30 C -50,40 -25,30 0,25 Z" fill="url(#vfSilverGrad)" stroke="#37474f" stroke-width="2" />
          </g>
          <g transform="translate(490, 220) scale(-1, 1)">
            <path d="M 0,0 C -40,-40 -60,-10 -90,10 C -60,20 -30,10 0,0 Z" fill="url(#vfSilverGrad)" stroke="#37474f" stroke-width="2" />
            <path d="M 0,25 C -35,-10 -50,15 -75,30 C -50,40 -25,30 0,25 Z" fill="url(#vfSilverGrad)" stroke="#37474f" stroke-width="2" />
          </g>
          <g transform="translate(300, 60)">
            <polygon points="0,-24 16,0 0,24 -16,0" fill="url(#vfSilverGem)" stroke="#ffffff" stroke-width="2" />
          </g>
          <!-- Huy hiệu Bạc Tinh Xảo (2 Sao - Model 05-khungbac.txt) -->
          <g transform="translate(300, 544)">
            <rect x="-60" y="-16" width="120" height="32" rx="16" fill="url(#vfSilverBadgeGrad)" stroke="#eceff1" stroke-width="2.5" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));" />
            <text x="-16" y="2" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#ffffff" style="text-shadow: 0 0 5px #b0bec5;">★</text>
            <text x="16" y="2" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#ffffff" style="text-shadow: 0 0 5px #b0bec5;">★</text>
          </g>
        </svg>
      `;
    } else if (fId === 'gold') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 0 14px rgba(255, 215, 0, 0.55));">
          <defs>
            <linearGradient id="vfGoldRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="20%" stop-color="#ffd700" /><stop offset="45%" stop-color="#ff9900" /><stop offset="70%" stop-color="#fff099" /><stop offset="90%" stop-color="#d4af37" /><stop offset="100%" stop-color="#8a6d1c" />
            </linearGradient>
            <linearGradient id="vfGoldBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fcf6ba" /><stop offset="100%" stop-color="#bf953f" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="236" fill="none" stroke="url(#vfGoldRingGrad)" stroke-width="26" />
          <circle cx="300" cy="300" r="254" fill="none" stroke="#ffffff" stroke-width="3.5" opacity="0.9" />
          <!-- Crown at Top 12h -->
          <g transform="translate(300, 48)">
            <path d="M -45,18 L -36,-16 L -16,4 L 0,-26 L 16,4 L 36,-16 L 45,18 Z" fill="url(#vfGoldRingGrad)" stroke="#5e3c04" stroke-width="3" />
            <circle cx="0" cy="6" r="4.5" fill="#e74c3c" stroke="none" />
          </g>
          <!-- Huy hiệu Danh Hiệu Hoàng Gia (3 Sao - Model 06-khungvang.txt) -->
          <g transform="translate(300, 544)">
            <rect x="-80" y="-17" width="160" height="34" rx="17" fill="url(#vfGoldBadgeGrad)" stroke="#ffffff" stroke-width="2.5" style="filter: drop-shadow(0 4px 12px rgba(255,215,0,0.4));" />
            <text x="-32" y="2" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#ffffff" style="text-shadow: 0 0 5px #ffd700;">★</text>
            <text x="0" y="2" text-anchor="middle" dominant-baseline="central" font-size="22" fill="#ffffff" style="text-shadow: 0 0 6px #ffd700;">★</text>
            <text x="32" y="2" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#ffffff" style="text-shadow: 0 0 5px #ffd700;">★</text>
          </g>
        </svg>
      `;
    } else if (fId === 'vip') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 170 170" fill="none" style="filter: drop-shadow(0 0 10px rgba(255, 182, 193, 0.45)) drop-shadow(0 0 18px rgba(212, 175, 55, 0.35));">
          <defs>
            <linearGradient id="vfVipRoyalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffd700" />
              <stop offset="20%" stop-color="#ffb6c1" />
              <stop offset="40%" stop-color="#fff5c0" />
              <stop offset="60%" stop-color="#ffffff" />
              <stop offset="80%" stop-color="#ffb6c1" />
              <stop offset="100%" stop-color="#bf953f" />
            </linearGradient>
            <linearGradient id="vfVipRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff5c0" />
              <stop offset="50%" stop-color="#ffd700" />
              <stop offset="100%" stop-color="#bf953f" />
            </linearGradient>
          </defs>
          <!-- Vành tròn chính Hoàng Triều Vĩnh Cửu -->
          <circle cx="85" cy="85" r="58" stroke="url(#vfVipRoyalGrad)" stroke-width="7" />
          <circle cx="85" cy="85" r="54" stroke="#ffb6c1" stroke-width="1.8" />
          <circle cx="85" cy="85" r="62" stroke="#fff5c0" stroke-width="1.2" opacity="0.8" stroke-dasharray="8 12" />
          <!-- Vương miện 3D nảy nhẹ ở 12h -->
          <g class="royal-lifetime-crown" transform="translate(85, 20)">
            <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="26" style="filter: drop-shadow(0 2px 6px rgba(212,175,55,0.6));">👑</text>
          </g>
          <!-- Huy hiệu VIP Lifetime ở 6h -->
          <g transform="translate(85, 149)">
            <rect x="-42" y="-9" width="84" height="18" rx="9" fill="url(#vfVipRibbonGrad)" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));" />
            <text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="900" fill="#4a3200" letter-spacing="1">VIP LIFETIME</text>
          </g>
        </svg>
      `;
    } else if (fId === 'diamond') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 0 16px rgba(0, 242, 254, 0.65));">
          <defs>
            <linearGradient id="vfDiaRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="25%" stop-color="#00f2fe" /><stop offset="50%" stop-color="#e0f7fa" /><stop offset="75%" stop-color="#4facfe" /><stop offset="100%" stop-color="#00f2fe" />
            </linearGradient>
            <linearGradient id="vfGemLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="50%" stop-color="#00f2fe" /><stop offset="100%" stop-color="#4facfe" />
            </linearGradient>
            <linearGradient id="vfDiaBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="50%" stop-color="#00f2fe" /><stop offset="100%" stop-color="#4facfe" />
            </linearGradient>
          </defs>
          <circle cx="300" cy="300" r="236" fill="none" stroke="url(#vfDiaRingGrad)" stroke-width="24" class="diamond-blink-sweep" />
          <circle cx="300" cy="300" r="254" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="14 26 50 26" opacity="0.9" />
          <!-- Top Right Asymmetrical Gems -->
          <g transform="translate(425, 145) rotate(22)" class="diamond-star-glint" style="filter: drop-shadow(0 0 8px #00f2fe);">
            <polygon points="0,-36 30,-15 30,22 0,42 -30,22 -30,-15" fill="#ffffff" stroke="#e0f7fa" stroke-width="1.8" />
            <polygon points="0,-36 30,-15 46,-38 0,-52" fill="url(#vfGemLight)" stroke="#ffffff" stroke-width="1.2" />
          </g>
          <!-- Bottom Left Crystals -->
          <g transform="translate(145, 445) rotate(-38)" class="diamond-star-glint" style="filter: drop-shadow(0 0 8px #00f2fe);">
            <polygon points="0,-42 18,0 0,42 -18,0" fill="url(#vfGemLight)" stroke="#ffffff" stroke-width="1.8" />
          </g>
          <!-- Huy hiệu Kim Cương & 4 Sao Lam Ngọc ở 6h (Model 07-khungkimcuong.txt) -->
          <g transform="translate(300, 544)">
            <rect x="-95" y="-17" width="190" height="34" rx="17" fill="url(#vfDiaBadgeGrad)" stroke="#ffffff" stroke-width="2.5" style="filter: drop-shadow(0 4px 15px rgba(0, 242, 254, 0.5));" />
            <text x="-60" y="2" text-anchor="middle" dominant-baseline="central" font-size="16">💎</text>
            <text x="-25" y="2" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#ffffff" style="text-shadow: 0 0 5px #00f2fe;">★</text>
            <text x="0" y="2" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#ffffff" style="text-shadow: 0 0 5px #00f2fe;">★</text>
            <text x="25" y="2" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#ffffff" style="text-shadow: 0 0 5px #00f2fe;">★</text>
            <text x="50" y="2" text-anchor="middle" dominant-baseline="central" font-size="18" fill="#ffffff" style="text-shadow: 0 0 5px #00f2fe;">★</text>
          </g>
        </svg>
      `;
    } else if (fId === 'mythic') {
      overlaySvg = `
        <svg class="vf-avatar-frame-svg" viewBox="0 0 600 600" style="filter: drop-shadow(0 0 16px rgba(255, 0, 127, 0.65));">
          <defs>
            <filter id="vfMythicGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur1" />
              <feGaussianBlur stdDeviation="15" result="blur2" />
              <feMerge><feMergeNode in="blur2" /><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="vfFireInfernoGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="core" />
              <feGaussianBlur stdDeviation="10" result="mid" />
              <feGaussianBlur stdDeviation="22" result="outer" />
              <feMerge><feMergeNode in="outer" /><feMergeNode in="mid" /><feMergeNode in="core" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="vfDragonScalesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fff0f8" /><stop offset="25%" stop-color="#ff3399" /><stop offset="65%" stop-color="#99004d" /><stop offset="100%" stop-color="#2b0016" />
            </linearGradient>
            <linearGradient id="vfDragonWingMembrane" x1="10%" y1="0%" x2="90%" y2="90%">
              <stop offset="0%" stop-color="#ff66b2" stop-opacity="0.8" /><stop offset="50%" stop-color="#99004d" stop-opacity="0.5" /><stop offset="100%" stop-color="#24001c" stop-opacity="0.15" />
            </linearGradient>
            <linearGradient id="vfPlasmaFireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="20%" stop-color="#ffb3da" /><stop offset="55%" stop-color="#ff007f" /><stop offset="85%" stop-color="#99004d" /><stop offset="100%" stop-color="#ff007f" stop-opacity="0" />
            </linearGradient>
            <radialGradient id="vfMatrixRingGrad" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stop-color="#ff007f" /><stop offset="95%" stop-color="#ff99cc" /><stop offset="100%" stop-color="#ffffff" />
            </radialGradient>
            <linearGradient id="vfHornMetallicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" /><stop offset="40%" stop-color="#ffb8db" /><stop offset="85%" stop-color="#a60053" />
            </linearGradient>
          </defs>

          <!-- 2. CÁC VÀNH ĐAI NĂNG LƯỢNG TRÒN -->
          <g id="frameRingsGroup" filter="url(#vfMythicGlow)">
            <circle cx="300" cy="300" r="186" fill="none" stroke="#ff007f" stroke-width="2" stroke-dasharray="8 14 3 14" opacity="0.6" />
            <circle cx="300" cy="300" r="176" fill="none" stroke="url(#vfMatrixRingGrad)" stroke-width="6.5" stroke-linecap="round" />
            <circle cx="300" cy="300" r="171" fill="none" stroke="#ffe6f3" stroke-width="1.6" stroke-dasharray="3 15 35 15" opacity="0.85" />
            <circle cx="300" cy="477" r="3.5" fill="#ffffff" /><circle cx="123" cy="300" r="3.5" fill="#ffffff" /><circle cx="477" cy="300" r="3.5" fill="#ffffff" />
          </g>

          <!-- 3. ĐUÔI RỒNG QUẤN GÓC DƯỚI BÊN TRÁI (7h - 9h) -->
          <g id="dragonTail" filter="url(#vfMythicGlow)">
            <path d="M 165,415 C 120,465 155,530 220,535 C 275,540 280,488 240,480 C 185,465 155,395 133,325 C 124,295 125,265 128,240" fill="none" stroke="url(#vfDragonScalesGrad)" stroke-width="22" stroke-linecap="round" />
            <polygon points="142,440 120,470 155,455" fill="#ffe6f2" /><polygon points="172,480 156,515 190,495" fill="#ffe6f2" />
            <polygon points="215,510 210,548 236,520" fill="#ffe6f2" /><polygon points="248,495 278,525 255,478" fill="#ffe6f2" />
            <path d="M 245,480 Q 305,505 325,488 Q 285,465 245,480 Z" fill="url(#vfHornMetallicGrad)" stroke="#ffffff" stroke-width="1.5" />
          </g>

          <!-- 4. MÓNG VUỐT BÁM VÀNH KHUNG (9h) -->
          <g id="dragonClaw" filter="url(#vfMythicGlow)">
            <path d="M 98,280 C 108,275 126,285 138,295 C 145,288 152,298 140,305 C 148,302 153,312 138,318 C 145,318 145,328 132,328 C 120,325 105,310 94,300 Z" fill="url(#vfDragonScalesGrad)" />
            <path d="M 138,295 Q 155,296 150,304" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" />
            <path d="M 140,305 Q 158,310 151,317" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" />
            <path d="M 135,318 Q 152,325 142,332" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" />
          </g>

          <!-- 5. ĐÔI CÁNH DƠI PHƯƠNG TÂY (9h - 11h) -->
          <g id="dragonWings" filter="url(#vfMythicGlow)">
            <path d="M 175,135 Q 145,65 105,30 Q 130,50 150,90 Q 168,120 175,135 Z" fill="#660033" opacity="0.85" />
            <path d="M 105,30 Q 100,10 90,5 Q 95,20 102,33 Z" fill="#ffffff" />
            <path d="M 105,30 Q 85,75 75,120 Q 110,95 150,90 Z" fill="url(#vfDragonWingMembrane)" opacity="0.6" />
            <path d="M 165,190 Q 110,120 45,85 Q 25,75 5,90 Q 30,105 75,135 Q 115,175 140,225 Z" fill="url(#vfDragonScalesGrad)" />
            <path d="M 45,85 Q 35,60 20,55 Q 30,75 42,88 Z" fill="#ffffff" />
            <path d="M 45,85 Q 40,150 25,215" stroke="#ff80bf" stroke-width="4.5" fill="none" stroke-linecap="round" />
            <path d="M 75,135 Q 70,205 60,265" stroke="#ff3385" stroke-width="4" fill="none" stroke-linecap="round" />
            <path d="M 115,175 Q 105,230 95,290" stroke="#99004d" stroke-width="3.5" fill="none" stroke-linecap="round" />
            <path d="M 45,85 Q 40,160 25,215 Q 45,190 60,265 Q 85,225 95,290 Q 120,240 140,225 C 115,175 75,135 45,85 Z" fill="url(#vfDragonWingMembrane)" />
          </g>

          <!-- 6. ĐẦU, CỔ VÀ SỪNG RỒNG (11h - 12h) -->
          <g id="dragonHeadAndNeck" filter="url(#vfMythicGlow)">
            <path d="M 128,245 C 120,175 155,128 200,95 C 215,85 232,85 245,95 C 230,115 205,140 185,185 C 170,220 160,250 155,270 Z" fill="url(#vfDragonScalesGrad)" />
            <polygon points="152,145 125,120 162,130" fill="#ffffff" /><polygon points="172,120 148,88 185,108" fill="#ffb3da" /><polygon points="198,98 185,62 212,88" fill="#ffe6f2" />
            <path d="M 218,80 C 205,48 170,38 145,42 C 170,55 195,68 210,83 Z" fill="#800040" />
            <path d="M 228,75 C 220,28 175,-8 118,0 C 160,18 200,48 215,82 Z" fill="url(#vfHornMetallicGrad)" stroke="#ffffff" stroke-width="1.5" />
            <path d="M 235,78 C 240,38 215,8 180,3 C 210,23 225,48 228,82 Z" fill="#ff1a8c" opacity="0.85" />
            <path d="M 215,75 C 240,75 272,90 295,110 C 265,115 245,120 225,105 Z" fill="url(#vfDragonScalesGrad)" />
            <path d="M 255,85 C 285,92 320,110 340,125 C 305,125 275,110 245,95 Z" fill="url(#vfDragonScalesGrad)" />
            <polygon points="315,122 323,138 328,125" fill="#ffffff" /><polygon points="295,116 300,130 306,120" fill="#ffffff" /><polygon points="275,110 278,122 284,113" fill="#ffffff" />
            <g class="dragon-jaw">
              <path d="M 260,133 C 285,148 310,156 325,158 C 305,146 290,138 270,133 Z" fill="#99004d" />
              <polygon points="300,148 308,136 314,151" fill="#ffffff" /><polygon points="282,140 288,130 293,142" fill="#ffffff" />
            </g>
            <ellipse cx="262" cy="94" rx="7.5" ry="4.5" transform="rotate(-15, 262, 94)" class="dragon-eye" fill="#ffccd9" />
            <polygon points="258,94 266,92 263,96" fill="#24001c" />
          </g>

          <!-- 7. LUỒNG LỬA MA THUẬT HUYỀN THOẠI (12h - 5h) -->
          <g id="dragonFlameLayer" class="fire-layer" filter="url(#vfFireInfernoGlow)">
            <path d="M 320,130 C 375,100 455,105 515,160 C 575,215 590,305 560,395 C 530,470 465,530 385,555 C 440,512 470,470 480,405 C 495,310 465,225 400,175 C 368,150 332,138 320,130 Z" fill="url(#vfPlasmaFireGrad)" />
            <path d="M 495,145 Q 565,125 595,175 Q 545,198 525,208 Z" fill="url(#vfPlasmaFireGrad)" />
            <path d="M 550,245 Q 620,255 605,315 Q 565,305 545,295 Z" fill="url(#vfPlasmaFireGrad)" />
            <path d="M 555,365 Q 605,410 575,465 Q 535,425 525,395 Z" fill="url(#vfPlasmaFireGrad)" />
            <path d="M 475,470 Q 495,545 430,575 Q 430,520 415,492 Z" fill="url(#vfPlasmaFireGrad)" />
            <path d="M 330,133 C 380,120 440,135 480,180 C 525,230 535,300 510,370 C 488,425 442,475 378,505 C 418,465 440,420 445,365 C 455,295 435,230 382,185 C 358,165 338,146 330,133 Z" fill="#ffffff" opacity="0.95" />
            <path class="plasma-stream" d="M 335,135 C 420,140 510,210 510,320 C 510,420 430,480 370,510" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-dasharray="25 15 45 15" stroke-linecap="round" />
            <path class="plasma-stream" d="M 345,145 C 440,165 480,240 470,350 C 460,420 400,470 360,490" fill="none" stroke="#ffb3da" stroke-width="3" stroke-dasharray="15 25" stroke-linecap="round" opacity="0.8" />
            <g fill="#ffffff">
              <circle cx="545" cy="155" r="5" /><circle cx="598" cy="230" r="3.5" /><circle cx="585" cy="355" r="5.5" /><circle cx="505" cy="495" r="4" /><circle cx="445" cy="555" r="3.5" />
              <path d="M 535,190 Q 535,205 535,220 Q 535,205 550,205 Q 535,205 535,190 Z" />
              <path d="M 570,305 Q 570,318 570,331 Q 570,318 583,318 Q 570,318 570,305 Z" />
              <path d="M 480,455 Q 480,470 480,485 Q 480,470 495,470 Q 480,470 480,455 Z" />
            </g>
            <circle cx="335" cy="133" r="18" fill="#ffffff" /><circle cx="335" cy="133" r="10" fill="#ffb8db" />
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
      <div class="vf-avatar-frame-box frame-${fId} ${extraClasses}" style="width: ${size}px; height: ${size}px;">
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

    // VIP effect
    if (eId === 'vip') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-vip animated-name-vip">${safeEscaped}</strong><span class="floating-crown-vip">👑</span></span>`;
    }

    // Pet effects
    if (eId === 'cat') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-cat">🐾 ${safeEscaped} 🐾</strong></span>`;
    }
    if (eId === 'dog') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-dog">🦴 ${safeEscaped} 🦴</strong></span>`;
    }

    // Event effects
    if (eId === 'birthday') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-birthday">🎉 ${safeEscaped} 🎂</strong></span>`;
    }
    if (eId === 'christmas') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-christmas">❄️ ${safeEscaped} 🔔</strong></span>`;
    }
    if (eId === 'halloween') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-halloween">🎃 ${safeEscaped} 🦇</strong></span>`;
    }
    if (eId === 'vietnam') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-vietnam">⭐ ${safeEscaped} 🇻🇳</strong></span>`;
    }
    if (eId === 'tet') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-tet">🧧 ${safeEscaped} 🌸</strong></span>`;
    }
    if (eId === 'easter') {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-easter">🐰 ${safeEscaped} 🥚</strong></span>`;
    }

    // Level-based effects
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
            <g class="diamond-sparkle sparkle-1"><circle cx="20" cy="14" r="2.5" fill="#ffffff" /></g>
            <g class="diamond-sparkle sparkle-2"><circle cx="110" cy="8" r="3" fill="#ffffff" /></g>
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
                  <stop offset="0%" stop-color="#ff007f" stop-opacity="0" /><stop offset="50%" stop-color="#ff66b2" stop-opacity="0.9" /><stop offset="100%" stop-color="#ff007f" />
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

    // Default fallback for VIP users who have not explicitly chosen another style
    if (eId === 'default' && typeof isUserVip === 'function' && isUserVip()) {
      return `<span class="vf-name-wrapper ${extraClasses}"><strong class="tier-vip animated-name-vip">${safeEscaped}</strong><span class="floating-crown-vip">👑</span></span>`;
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

  // 5. MODAL & TAB & FILTER LOGIC
  function openWardrobeModal(defaultTab = 'frames') {
    if (typeof closeModal === 'function') {
      closeModal('modal-profile');
    }
    wardrobePreviewState = { ...getEquippedWardrobe() };
    activeWardrobeTab = defaultTab || 'frames';
    activeWardrobeFilter = 'all';

    if (typeof openModal === 'function') {
      openModal('modal-wardrobe');
    } else {
      const el = document.getElementById('modal-wardrobe');
      if (el) el.classList.add('active');
    }

    updateWardrobePointsDisplay();
    renderWardrobePreview();
    switchWardrobeTab(activeWardrobeTab);
  }
  window.openWardrobeModal = openWardrobeModal;

  function updateWardrobePointsDisplay() {
    const ptsEl = document.getElementById('wardrobe-user-points');
    if (ptsEl) {
      const pts = (typeof getUserPoints === 'function') ? getUserPoints() : 0;
      ptsEl.textContent = `${pts.toLocaleString()} VoCoin`;
    }
  }
  window.updateWardrobePointsDisplay = updateWardrobePointsDisplay;

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

    // Show/hide filter bar for titles tab if needed
    const filterBar = document.getElementById('wardrobe-filter-bar');
    if (filterBar) {
      filterBar.style.display = (activeWardrobeTab === 'titles') ? 'none' : 'flex';
    }

    updateFilterPillCounts();
    renderWardrobeTabContent(activeWardrobeTab);
  }
  window.switchWardrobeTab = switchWardrobeTab;

  function filterWardrobeCategory(filterType) {
    activeWardrobeFilter = filterType || 'all';
    const pills = ['all', 'shop', 'event', 'vip', 'level'];
    pills.forEach(p => {
      const btn = document.getElementById(`wardrobe-filter-${p}`);
      if (btn) {
        if (p === activeWardrobeFilter) {
          btn.className = 'btn btn-xs wardrobe-filter-pill active';
        } else {
          btn.className = 'btn btn-xs wardrobe-filter-pill btn-outline';
        }
      }
    });

    renderWardrobeTabContent(activeWardrobeTab);
  }
  window.filterWardrobeCategory = filterWardrobeCategory;

  function updateFilterPillCounts() {
    const items = VOCAFLOW_WARDROBE_REGISTRY[activeWardrobeTab] || [];
    const countAll = items.length;
    const countShop = items.filter(i => i.type === 'shop').length;
    const countEvent = items.filter(i => i.type === 'event').length;
    const countVip = items.filter(i => i.type === 'vip').length;
    const countLevel = items.filter(i => i.type === 'level' || (!i.type && i.minLevel)).length;

    const elAll = document.getElementById('wardrobe-filter-count-all');
    if (elAll) elAll.textContent = countAll;
    const elShop = document.getElementById('wardrobe-filter-count-shop');
    if (elShop) elShop.textContent = countShop;
    const elEvent = document.getElementById('wardrobe-filter-count-event');
    if (elEvent) elEvent.textContent = countEvent;
    const elVip = document.getElementById('wardrobe-filter-count-vip');
    if (elVip) elVip.textContent = countVip;
    const elLevel = document.getElementById('wardrobe-filter-count-level');
    if (elLevel) elLevel.textContent = countLevel;
  }

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
    const allItems = VOCAFLOW_WARDROBE_REGISTRY[tabName] || [];
    const userAvatar = (typeof getUserAvatar === 'function') ? getUserAvatar() : (currentUser?.avatar || '👤');
    const userName = (currentUser && currentUser.displayName) ? currentUser.displayName : (localStorage.getItem('vocaflow_user_name') || 'Flower');

    // Filter items
    let filteredItems = allItems;
    if (tabName !== 'titles' && activeWardrobeFilter !== 'all') {
      if (activeWardrobeFilter === 'shop') {
        filteredItems = allItems.filter(i => i.type === 'shop');
      } else if (activeWardrobeFilter === 'event') {
        filteredItems = allItems.filter(i => i.type === 'event');
      } else if (activeWardrobeFilter === 'vip') {
        filteredItems = allItems.filter(i => i.type === 'vip');
      } else if (activeWardrobeFilter === 'level') {
        filteredItems = allItems.filter(i => i.type === 'level' || (!i.type && i.minLevel));
      }
    }

    const equippedItemId = equipped[tabName === 'frames' ? 'frame' : (tabName === 'nameEffects' ? 'nameEffect' : 'title')] || 'default';

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 36px 12px; color: var(--text-muted); font-size: 13px;">
          <span style="font-size: 28px; display: block; margin-bottom: 8px;">🔍</span>
          Không có vật phẩm nào trong mục này.
        </div>
      `;
      return;
    }

    let cardsHtml = '<div class="vf-wardrobe-grid">';

    filteredItems.forEach(item => {
      const isUnlocked = isWardrobeItemUnlocked(tabName, item.id);
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
        statusBadge = `<span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; font-size: 10px; font-weight: 800; border: 1px solid rgba(16,185,129,0.5);">✅ Đang Dùng</span>`;
      } else if (isUnlocked) {
        statusBadge = `<span class="badge" style="background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 10px; font-weight: 700; border: 1px solid rgba(56,189,248,0.35);">🔓 Đã Sở Hữu</span>`;
      } else if (item.type === 'vip') {
        statusBadge = `<span class="badge" style="background: rgba(245,158,11,0.2); color: #ffd700; font-size: 10px; font-weight: 800; border: 1px solid rgba(255,215,0,0.5);">👑 Đặc quyền VIP</span>`;
      } else if (item.price) {
        const typeIcon = item.type === 'event' ? '🎪' : '🛍️';
        statusBadge = `<span class="badge" style="background: rgba(245,158,11,0.15); color: #fbbf24; font-size: 10px; font-weight: 800; border: 1px solid rgba(245,158,11,0.4);">${typeIcon} ${item.price}🪙</span>`;
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
      } else if (item.type === 'vip') {
        actionBtn = `
          <div style="display: flex; gap: 6px; width: 100%;">
            <button type="button" class="btn btn-outline btn-sm" onclick="previewWardrobeItem('${tabName}', '${item.id}')" style="flex: 1; font-size: 11px; padding: 4px 6px;" title="Xem thử trên người">👁️ Thử</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="if (typeof openVipPricingModal === 'function') openVipPricingModal(); else if (typeof openVipModal === 'function') openVipModal();" style="flex: 1.8; font-size: 11.5px; font-weight: 800; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: #000;">
              👑 Nâng Cấp VIP
            </button>
          </div>
        `;
      } else if (item.price) {
        actionBtn = `
          <div style="display: flex; gap: 6px; width: 100%;">
            <button type="button" class="btn btn-outline btn-sm" onclick="previewWardrobeItem('${tabName}', '${item.id}')" style="flex: 1; font-size: 11px; padding: 4px 6px;" title="Xem thử trên người">👁️ Thử</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="buyWardrobeItem('${tabName}', '${item.id}')" style="flex: 1.8; font-size: 11.5px; font-weight: 800; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; color: #000;">
              🛒 Mua (${item.price}🪙)
            </button>
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
