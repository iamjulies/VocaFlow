// =========================================================================
// VOCAFLOW SPA ROUTER & URL HISTORY ENGINE (v0.10.9-45)
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

  // 1. Check GitHub Pages 404 SPA redirect param ?p=...
  const pParam = searchParams.get('p');
  if (pParam) {
    return decodeURIComponent(pParam);
  }

  // 2. Check legacy deep-link params ?user=... / ?u=... / ?profile=...
  const userParam = searchParams.get('user') || searchParams.get('u') || searchParams.get('profile');
  if (userParam) {
    const cleanUser = userParam.replace(/^@/, '').trim();
    return cleanUser ? '/@' + cleanUser : '';
  }

  // 3. Check direct pathname
  const basePath = getAppBasePath();
  let path = l.pathname;
  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  if (!path || path === '/' || path === '/index.html' || path === '/vocaflow.html') {
    return '/homepage';
  }
  return path;
}
window.resolveRouteFromUrl = resolveRouteFromUrl;

function navigateToRoute(route, isPopState = false) {
  if (!route) return;
  isRouterNavigating = true;

  try {
    let clean = route.trim();
    if (clean.startsWith('/')) clean = clean.slice(1);

    // Handle @username or user/@username or u/username
    if (clean.startsWith('@') || clean.startsWith('user/@') || clean.startsWith('user/') || clean.startsWith('u/')) {
      let handle = clean.replace(/^(user\/@?|u\/|@)/, '').trim();
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
        // Close modal overlays if open
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        break;

      case 'me':
      case 'profile':
        if (typeof openProfileModal === 'function') openProfileModal();
        break;

      case 'shop':
      case 'store':
        if (typeof openShopModal === 'function') openShopModal();
        break;

      case 'vip':
      case 'pricing':
        if (typeof openVipPricingModal === 'function') openVipPricingModal();
        break;

      case 'mentor':
      case 'ai':
      case 'chat':
        if (typeof openAiMentorModal === 'function') openAiMentorModal();
        break;

      case 'wallet':
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

      case 'settings':
        if (typeof openSettingsModal === 'function') openSettingsModal();
        break;

      case 'achievements':
        if (typeof openAchievementsModal === 'function') openAchievementsModal();
        break;

      case 'guide':
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

  // Restore clean URL in address bar if ?p= was used
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
