// =========================================================================
// VOCAFLOW SPA ROUTER & URL HISTORY ENGINE (v0.10.9-52)
// Enables direct clean URLs & browser history navigation (pushState/popstate)
// =========================================================================

let isRouterNavigating = false;

function getAppBasePath() {
  if (window.location.protocol === 'file:') return '';
  const pathname = window.location.pathname;
  if (pathname.includes('/VocaFlow')) return '/VocaFlow';
  return '';
}
window.getAppBasePath = getAppBasePath;

function updateAppUrlRoute(routePath, title = 'VocaFlow', replace = false) {
  if (window.location.protocol === 'file:') return;
  if (isRouterNavigating) return;

  const basePath = getAppBasePath();
  let cleanRoute = routePath.startsWith('/') ? routePath : '/' + routePath;
  const fullTarget = basePath ? (basePath + cleanRoute) : cleanRoute;

  try {
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl === fullTarget) return;

    if (replace) {
      window.history.replaceState({ route: routePath }, title, fullTarget);
    } else {
      window.history.pushState({ route: routePath }, title, fullTarget);
    }
  } catch (e) {
    console.warn('Router pushState failed:', e);
  }
}
window.updateAppUrlRoute = updateAppUrlRoute;

function resolveRouteFromUrl() {
  const l = window.location;
  const searchParams = new URLSearchParams(l.search);

  // 1. Check referral code param ?ref=... / ?invite=...
  const refParam = searchParams.get('ref') || searchParams.get('invite');
  if (refParam) {
    const cleanRef = refParam.trim().toUpperCase();
    if (cleanRef) sessionStorage.setItem('vocaflow_pending_ref_code', cleanRef);
  }

  // 2. Check GitHub Pages 404 SPA redirect param ?p=...
  const pParam = searchParams.get('p');
  if (pParam) {
    let decoded = decodeURIComponent(pParam);
    return decoded.split('?')[0].trim();
  }

  // 3. Check legacy deep-link params ?user=... / ?u=... / ?profile=...
  const userParam = searchParams.get('user') || searchParams.get('u') || searchParams.get('profile');
  const postParam = searchParams.get('post') || searchParams.get('p_id');
  if (userParam) {
    const cleanUser = userParam.replace(/^@+/, '').split('?')[0].replace(/\/+$/, '').trim();
    if (postParam) {
      return `/@${cleanUser}/post/${postParam.trim()}`;
    }
    return cleanUser ? '/@' + cleanUser : '';
  }

  if (postParam) {
    return `/community/post/${postParam.trim()}`;
  }

  // 4. Check direct pathname
  const basePath = getAppBasePath();
  let path = l.pathname;
  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  if (!path || path === '/' || path === '/index.html' || path === '/vocaflow.html') {
    if (refParam) return `/invite/${refParam.trim().toUpperCase()}`;
    return '/homepage';
  }
  return path.split('?')[0].trim();
}
window.resolveRouteFromUrl = resolveRouteFromUrl;

function navigateToRoute(route, isPopState = false) {
  if (!route) return;
  isRouterNavigating = true;

  try {
    let clean = route.trim();
    if (clean.startsWith('/')) clean = clean.slice(1);
    clean = clean.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();

    // 1. Handle deep link to specific post: /@username/post/postId or user/@username/post/postId
    if (clean.includes('/post/')) {
      const parts = clean.split('/post/');
      const authorPart = parts[0].replace(/^(user\/@?|u\/|@+)/, '').trim();
      const postId = (parts[1] || '').trim();

      if (authorPart && authorPart !== 'community') {
        // Open user public profile on community tab and highlight post
        if (typeof openPublicProfileModal === 'function') {
          openPublicProfileModal('@' + authorPart, '', authorPart);
        } else if (typeof openPublicProfileByAuthor === 'function') {
          openPublicProfileByAuthor('@' + authorPart, '', authorPart);
        }
        setTimeout(() => {
          if (typeof switchPubProfileTab === 'function') switchPubProfileTab('community');
          if (postId && typeof highlightAndScrollToPost === 'function') {
            highlightAndScrollToPost(postId, true);
          }
        }, 300);
        return;
      } else if (postId) {
        // Open main community feed, expand comments and highlight post
        if (typeof openProfileModal === 'function') openProfileModal('community');
        setTimeout(() => {
          if (typeof togglePostCommentsSection === 'function') {
            communityActiveCommentsPostId = postId;
            if (typeof renderCommunityFeed === 'function') renderCommunityFeed();
          }
          if (typeof highlightAndScrollToPost === 'function') {
            highlightAndScrollToPost(postId, false);
          }
        }, 300);
        return;
      }
    }

    // 2. Handle /invite/@username/code or /invite/code or /referral/...
    if (clean.startsWith('invite') || clean.startsWith('referral')) {
      const parts = clean.split('/').filter(Boolean);
      let refCode = '';
      if (parts.length >= 3) {
        // invite/@username/code
        refCode = parts[2].trim().toUpperCase();
      } else if (parts.length === 2) {
        // invite/code or invite/@username
        const seg = parts[1].trim();
        if (!seg.startsWith('@')) {
          refCode = seg.toUpperCase();
        }
      }
      if (refCode) {
        sessionStorage.setItem('vocaflow_pending_ref_code', refCode);
      }
      if (typeof openReferralModal === 'function') openReferralModal();
      return;
    }

    // 3. Handle @username or user/@username or u/username
    if (clean.startsWith('@') || clean.startsWith('user/@') || clean.startsWith('user/') || clean.startsWith('u/')) {
      let handle = clean.replace(/^(user\/@?|u\/|@+)/, '').trim();
      handle = handle.replace(/^@+/, '').trim();
      if (handle) {
        if (typeof openPublicProfileModal === 'function') {
          openPublicProfileModal('@' + handle, '', handle);
        } else if (typeof openPublicProfileByAuthor === 'function') {
          openPublicProfileByAuthor('@' + handle, '', handle);
        }
      }
      return;
    }

    // Clean first segment
    const segment = clean.split('/')[0].toLowerCase();
    switch (segment) {
      case 'homepage':
      case 'decks':
      case 'home':
        if (typeof showScreen === 'function') showScreen('screen-decks');
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        break;

      case 'me':
      case 'profile':
        if (typeof openProfileModal === 'function') openProfileModal();
        break;

      case 'community':
      case 'feed':
        if (typeof openProfileModal === 'function') openProfileModal('community');
        break;

      case 'shop':
      case 'store':
        if (typeof openShopModal === 'function') openShopModal();
        break;

      case 'vocavip':
      case 'vip':
      case 'pricing':
        if (typeof openVipPricingModal === 'function') openVipPricingModal();
        break;

      case 'flowtreak':
      case 'flowstreak':
      case 'streak':
      case 'calendar':
        if (typeof openFlowCalendarModal === 'function') openFlowCalendarModal();
        break;

      case 'notifications':
      case 'notification':
      case 'notif':
        if (typeof openNotificationsModal === 'function') openNotificationsModal();
        break;

      case 'vocamail':
      case 'mail':
      case 'inbox':
        if (typeof openVocaMailModal === 'function') openVocaMailModal();
        break;

      case 'report':
      case 'bug':
      case 'feedback':
        if (typeof openBugReportModal === 'function') openBugReportModal();
        break;

      case 'ads':
      case 'ad':
      case 'rewarded-ad':
      case 'video-ads':
        if (typeof openRewardedAdModal === 'function') openRewardedAdModal();
        break;

      case 'queue':
      case 'review':
      case 'daily':
        if (typeof openReviewQueueModal === 'function') openReviewQueueModal();
        break;

      case 'vocalib':
      case 'library':
      case 'lib':
        if (typeof openLibraryModal === 'function') openLibraryModal();
        break;

      case 'vocadeckai':
      case 'aistudio':
      case 'ai-studio':
      case 'deckai':
        if (typeof openAiDeckStudioModal === 'function') openAiDeckStudioModal();
        break;

      case 'dev':
      case 'publisher':
      case 'admin':
        if (sessionStorage.getItem('vocaflow_dev_authorized') === 'true') {
          if (typeof openPublisherModal === 'function') openPublisherModal('students');
        } else {
          const pass = prompt('🔒 CỔNG QUẢN TRỊ DEVELOPER (PUBLISHER PORTAL)\nVui lòng nhập mật khẩu xác thực Developer:');
          if (pass) {
            const cleanPass = pass.toLowerCase().trim().replace(/\s+/g, ' ');
            const validTriggers = [
              '/gamemode creative', 'gamemode creative',
              '/gamemode 1', 'gamemode 1',
              '/gamemode c', 'gamemode c',
              '/godmode', 'godmode',
              '/god mode', 'god mode',
              '/god', 'god',
              '/creative', 'creative',
              '/admin', 'admin',
              '/publisher', 'publisher',
              'congguantri', '/congguantri',
              'cổng quản trị'
            ];
            if (validTriggers.includes(cleanPass)) {
              sessionStorage.setItem('vocaflow_dev_authorized', 'true');
              if (typeof showToast === 'function') showToast('🕹️ Xác thực Developer thành công!');
              if (typeof openPublisherModal === 'function') openPublisherModal('students');
            } else {
              if (typeof showToast === 'function') showToast('⛔ Mật khẩu Developer không chính xác!');
              if (typeof showScreen === 'function') showScreen('screen-decks');
            }
          } else {
            if (typeof showScreen === 'function') showScreen('screen-decks');
          }
        }
        break;

      case 'mentor':
      case 'ai':
      case 'chat':
        if (typeof openAiMentorModal === 'function') openAiMentorModal();
        break;

      case 'wallet':
      case 'studio':
        if (typeof openWalletStudioModal === 'function') openWalletStudioModal();
        break;

      case 'mistakes':
      case 'errors':
        if (typeof openMistakeNotebookModal === 'function') openMistakeNotebookModal();
        break;

      case 'wheel':
      case 'spin':
        if (typeof openLuckyWheelModal === 'function') openLuckyWheelModal();
        break;

      case 'referral':
      case 'invite':
        if (typeof openReferralModal === 'function') openReferralModal();
        break;

      case 'settings':
        if (typeof openSettingsModal === 'function') openSettingsModal();
        break;

      case 'achievements':
      case 'badges':
        if (typeof openAchievementsModal === 'function') openAchievementsModal();
        break;

      case 'guide':
      case 'help':
        if (typeof openUserGuideModal === 'function') openUserGuideModal();
        break;

      default:
        // If unknown route, default to homepage without error
        if (typeof showScreen === 'function') showScreen('screen-decks');
        break;
    }
  } finally {
    isRouterNavigating = false;
  }
}
window.navigateToRoute = navigateToRoute;

function initSpaRouter() {
  const targetRoute = resolveRouteFromUrl();

  // Restore clean URL in address bar if ?p= or legacy ?user= was used
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('p') || searchParams.has('user') || searchParams.has('u') || searchParams.has('profile')) {
    const basePath = getAppBasePath();
    const cleanPath = (targetRoute.startsWith('/') ? targetRoute : '/' + targetRoute);
    try {
      window.history.replaceState({ route: cleanPath }, 'VocaFlow', basePath ? basePath + cleanPath : cleanPath);
    } catch (e) {}
  }

  // Delay slightly to let data and DOM finish initializing
  setTimeout(() => {
    navigateToRoute(targetRoute, false);
  }, 400);

  // Listen to popstate (Browser Back/Forward buttons)
  window.addEventListener('popstate', (e) => {
    const route = resolveRouteFromUrl();
    navigateToRoute(route, true);
  });
}
window.initSpaRouter = initSpaRouter;

