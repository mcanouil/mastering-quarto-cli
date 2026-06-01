/**
 * Remember Extension - Navigation Position Persistence
 *
 * Saves and restores the user's scroll position and current anchor or slide
 * indices for HTML, Quarto book, and Reveal.js outputs.
 *
 * The Quarto project type (book, website, default) is delivered by the
 * companion Lua filter through a `<script id="quarto-remember-config"
 * type="application/json">` block injected into the page head. The client
 * never has to guess from theme-specific DOM selectors.
 *
 * @author Mickaël Canouil
 * @version 1.1.0
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'quarto-remember-position';
  const STORAGE_TIMESTAMP_KEY = 'quarto-remember-timestamp';
  const CHAPTER_KEY = 'quarto-remember-chapter';
  const PROMPT_SHOWN_KEY = 'quarto-remember-prompt-shown';
  const SESSION_ACTIVE_KEY = 'quarto-remember-session-active';
  const CONFIG_ELEMENT_ID = 'quarto-remember-config';
  const PROMPT_COOLDOWN = 5000;

  /**
   * Configuration injected by the Lua filter via `<script
   * id="quarto-remember-config" type="application/json">`.
   *
   * Shape:
   *   {
   *     "project-type": "book" | "website" | "default",
   *     "page-exclude": string[],
   *     "separate-chapter-state": boolean
   *   }
   *
   * If the element is missing or malformed, the defaults below preserve the
   * previous "single document" behaviour.
   *
   * @returns {{projectType: string, pageExclude: string[], separateChapterState: boolean}}
   */
  function readConfig() {
    const fallback = {
      projectType: 'default',
      pageExclude: [],
      separateChapterState: false
    };
    const element = document.getElementById(CONFIG_ELEMENT_ID);
    if (!element) {
      return fallback;
    }
    try {
      const raw = JSON.parse(element.textContent || '{}');
      return {
        projectType: typeof raw['project-type'] === 'string' ? raw['project-type'] : fallback.projectType,
        pageExclude: Array.isArray(raw['page-exclude']) ? raw['page-exclude'] : fallback.pageExclude,
        separateChapterState: raw['separate-chapter-state'] === true
      };
    } catch (e) {
      console.warn('Remember: invalid configuration JSON, falling back to defaults.', e);
      return fallback;
    }
  }

  const CONFIG = readConfig();

  /**
   * Feature-detect `localStorage` and `sessionStorage` before any other work.
   * Some private browsing modes throw on `setItem`, so a probe write is
   * required to be sure.
   *
   * @param {Storage} storage
   * @returns {boolean}
   */
  function isStorageUsable(storage) {
    if (!storage) {
      return false;
    }
    const probeKey = '__quarto_remember_probe__';
    try {
      storage.setItem(probeKey, '1');
      storage.removeItem(probeKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  const LOCAL_STORAGE_OK = isStorageUsable(typeof window !== 'undefined' ? window.localStorage : null);
  const SESSION_STORAGE_OK = isStorageUsable(typeof window !== 'undefined' ? window.sessionStorage : null);

  /**
   * Determine whether the current page belongs to a Quarto book.
   * Now driven by the Lua-injected config, not DOM selectors.
   *
   * @returns {boolean}
   */
  function isQuartoBook() {
    return CONFIG.projectType === 'book';
  }

  /**
   * Compute the page identifier.
   *
   * For book projects, all chapters share a single identifier (the book
   * root) so the extension can redirect across chapters. For every other
   * project type, the full pathname is used.
   *
   * @returns {string}
   */
  function computePageIdentifier() {
    if (isQuartoBook()) {
      const parts = window.location.pathname.split('/');
      parts.pop();
      return parts.join('/') || '/';
    }
    return window.location.pathname;
  }

  let pageIdentifier = computePageIdentifier();

  /**
   * Invalidate the cached page identifier whenever the URL changes within
   * an SPA-style navigation. The browser does not reload the script on
   * `popstate`/`hashchange`, so the identifier must be recomputed.
   */
  function watchPageIdentifier() {
    const refresh = () => {
      pageIdentifier = computePageIdentifier();
    };
    window.addEventListener('popstate', refresh);
    window.addEventListener('hashchange', refresh);

    // Hook into pushState/replaceState so client-side routers also trigger
    // the refresh, mirroring the browser's own popstate behaviour.
    ['pushState', 'replaceState'].forEach((method) => {
      const original = history[method];
      if (typeof original !== 'function') {
        return;
      }
      history[method] = function patched(...args) {
        const result = original.apply(this, args);
        refresh();
        return result;
      };
    });
  }

  /**
   * Test the current pathname against the user-configured exclusion list.
   * Each entry is matched either literally (substring) or as a glob with
   * `*` standing for one path segment.
   *
   * @returns {boolean}
   */
  function isExcludedPage() {
    if (!CONFIG.pageExclude.length) {
      return false;
    }
    const pathname = window.location.pathname;
    return CONFIG.pageExclude.some((pattern) => {
      if (typeof pattern !== 'string' || pattern === '') {
        return false;
      }
      if (pattern.indexOf('*') === -1) {
        return pathname.indexOf(pattern) !== -1;
      }
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
      try {
        return new RegExp('^' + escaped + '$').test(pathname);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Read the saved navigation payload, scoped to the current page.
   *
   * @returns {object|null}
   */
  function getStoredPosition() {
    if (!LOCAL_STORAGE_OK) {
      return null;
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
      if (!data || !timestamp) {
        return null;
      }
      const position = JSON.parse(data);
      if (position.page !== pageIdentifier) {
        return null;
      }
      return Object.assign({}, position, { timestamp: parseInt(timestamp, 10) });
    } catch (e) {
      console.error('Remember: Failed to retrieve stored position', e);
      return null;
    }
  }

  /**
   * Read the saved chapter payload when `separate-chapter-state` is on.
   *
   * @returns {object|null}
   */
  function getStoredChapter() {
    if (!LOCAL_STORAGE_OK || !CONFIG.separateChapterState) {
      return null;
    }
    try {
      const data = localStorage.getItem(CHAPTER_KEY);
      if (!data) {
        return null;
      }
      const parsed = JSON.parse(data);
      if (parsed.page !== pageIdentifier) {
        return null;
      }
      return parsed;
    } catch (e) {
      console.error('Remember: Failed to retrieve stored chapter', e);
      return null;
    }
  }

  /**
   * Persist a navigation payload for the current page.
   *
   * @param {object} position
   */
  function savePosition(position) {
    if (!LOCAL_STORAGE_OK) {
      return;
    }
    try {
      const data = {
        page: pageIdentifier,
        url: window.location.pathname,
        scrollY: position.scrollY || 0,
        hash: position.hash || '',
        slideIndices: position.slideIndices || null
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());

      // Optional chapter-state branch: track which chapter is current
      // independently from the scroll position inside that chapter.
      if (CONFIG.separateChapterState && isQuartoBook()) {
        const chapter = {
          page: pageIdentifier,
          url: window.location.pathname,
          hash: window.location.hash || ''
        };
        localStorage.setItem(CHAPTER_KEY, JSON.stringify(chapter));
      }
    } catch (e) {
      console.error('Remember: Failed to save position', e);
    }
  }

  /**
   * Wipe the stored position and chapter payloads.
   */
  function clearStoredPosition() {
    if (!LOCAL_STORAGE_OK) {
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      if (CONFIG.separateChapterState) {
        localStorage.removeItem(CHAPTER_KEY);
      }
    } catch (e) {
      console.error('Remember: Failed to clear stored position', e);
    }
  }

  /**
   * Check whether the resume prompt was shown within the cooldown window.
   *
   * @returns {boolean}
   */
  function wasPromptRecentlyShown() {
    if (!SESSION_STORAGE_OK) {
      return false;
    }
    try {
      const lastShown = sessionStorage.getItem(PROMPT_SHOWN_KEY);
      if (!lastShown) {
        return false;
      }
      return Date.now() - parseInt(lastShown, 10) < PROMPT_COOLDOWN;
    } catch (e) {
      return false;
    }
  }

  /**
   * Record that the resume prompt was shown.
   */
  function markPromptShown() {
    if (!SESSION_STORAGE_OK) {
      return;
    }
    try {
      sessionStorage.setItem(PROMPT_SHOWN_KEY, Date.now().toString());
    } catch (e) {
      // sessionStorage refused to write; nothing else to do.
    }
  }

  /**
   * Render a modal dialog asking the user whether to resume.
   *
   * @param {string} message
   * @param {Function} onAccept
   * @param {Function} onDecline
   */
  function showPrompt(message, onAccept, onDecline) {
    if (wasPromptRecentlyShown()) {
      return;
    }
    markPromptShown();

    const previouslyFocused = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'remember-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'remember-prompt-title');
    overlay.setAttribute('aria-describedby', 'remember-prompt-message');

    const modal = document.createElement('div');
    modal.className = 'remember-modal';

    const title = document.createElement('h3');
    title.id = 'remember-prompt-title';
    title.textContent = 'Resume Navigation?';
    title.className = 'remember-title';

    const text = document.createElement('p');
    text.id = 'remember-prompt-message';
    text.textContent = message;
    text.className = 'remember-message';

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'remember-buttons';

    const cleanup = () => {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
      document.removeEventListener('keydown', handleKeydown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };

    const declineBtn = document.createElement('button');
    declineBtn.type = 'button';
    declineBtn.textContent = 'No';
    declineBtn.className = 'remember-btn remember-btn-decline';
    declineBtn.setAttribute('aria-label', 'No, start from the beginning');
    declineBtn.onclick = () => {
      cleanup();
      onDecline();
    };

    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.textContent = 'Yes';
    acceptBtn.className = 'remember-btn remember-btn-accept';
    acceptBtn.setAttribute('aria-label', 'Yes, resume where I left off');
    acceptBtn.onclick = () => {
      cleanup();
      onAccept();
    };

    const focusableElements = () => [declineBtn, acceptBtn];

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        onDecline();
        return;
      }
      if (e.key === 'Tab') {
        const elements = focusableElements();
        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    buttonContainer.appendChild(declineBtn);
    buttonContainer.appendChild(acceptBtn);
    modal.appendChild(title);
    modal.appendChild(text);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);
    declineBtn.focus();
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Format a saved timestamp as a relative phrase.
   *
   * @param {number} timestamp Unix timestamp in milliseconds
   * @returns {string}
   */
  function formatTimestamp(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  /**
   * Restore the saved scroll position or hash for the current document.
   *
   * @param {object} position
   */
  function restoreScrollPosition(position) {
    if (!position) {
      return;
    }
    if (position.hash) {
      window.location.hash = position.hash;
      return;
    }
    if (position.scrollY && typeof position.scrollY === 'number') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: position.scrollY,
        left: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }
  }

  /**
   * Wire up scroll, hash, click, and unload listeners that persist the
   * user's current position.
   */
  function setupScrollTracking() {
    let saveTimeout;

    const saveCurrentPosition = () => {
      savePosition({
        scrollY: window.scrollY,
        hash: window.location.hash
      });
    };

    if (isQuartoBook()) {
      saveCurrentPosition();
    }

    window.addEventListener('scroll', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveCurrentPosition, 500);
    }, { passive: true });

    window.addEventListener('hashchange', saveCurrentPosition);

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href) {
        saveCurrentPosition();
      }
    }, { passive: true });

    window.addEventListener('beforeunload', saveCurrentPosition);
  }

  /**
   * Initialise the Reveal.js code path.
   */
  function initRevealJS() {
    if (typeof Reveal === 'undefined') {
      console.warn('Remember: Reveal.js not found');
      return;
    }

    Reveal.on('ready', () => {
      const stored = getStoredPosition();

      if (stored && stored.slideIndices) {
        const message = `You left this presentation ${formatTimestamp(stored.timestamp)}. Would you like to resume where you left off?`;
        showPrompt(message,
          () => Reveal.slide(stored.slideIndices.h, stored.slideIndices.v, stored.slideIndices.f),
          () => clearStoredPosition()
        );
      }

      Reveal.on('slidechanged', () => {
        savePosition({ slideIndices: Reveal.getIndices() });
      });

      window.addEventListener('beforeunload', () => {
        savePosition({ slideIndices: Reveal.getIndices() });
      });
    });
  }

  /**
   * Check whether the current session is already active (the user has been
   * navigating within this site).
   *
   * @returns {boolean}
   */
  function isSessionActive() {
    if (!SESSION_STORAGE_OK) {
      return false;
    }
    try {
      return sessionStorage.getItem(SESSION_ACTIVE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Mark the current session as active.
   */
  function markSessionActive() {
    if (!SESSION_STORAGE_OK) {
      return;
    }
    try {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    } catch (e) {
      // sessionStorage refused to write; nothing else to do.
    }
  }

  /**
   * Initialise the HTML/Quarto-book code path.
   */
  function initHTML() {
    const stored = getStoredPosition();
    const chapter = getStoredChapter();
    const sessionActive = isSessionActive();
    const inBook = isQuartoBook();

    // Chapter-only branch: if `separate-chapter-state` is enabled and we are
    // currently on a different chapter than the one we last visited, prefer
    // redirecting to that chapter before considering scroll restoration.
    if (inBook && CONFIG.separateChapterState && chapter && !sessionActive) {
      const currentPath = window.location.pathname;
      if (chapter.url && chapter.url !== currentPath) {
        const message = `You were reading a different chapter ${formatTimestamp(stored ? stored.timestamp : Date.now())}. Would you like to return to where you were?`;
        showPrompt(message,
          () => {
            markSessionActive();
            window.location.href = chapter.url + (chapter.hash || '');
          },
          () => {
            markSessionActive();
            clearStoredPosition();
          }
        );
        setupScrollTracking();
        return;
      }
    }

    const handleNavigation = () => {
      markSessionActive();
      if (stored) {
        clearStoredPosition();
      }
    };

    window.addEventListener('beforeunload', handleNavigation);

    if (stored && !sessionActive) {
      const currentPath = window.location.pathname;
      const storedPath = stored.url || currentPath;
      const isDifferentPage = currentPath !== storedPath;

      const shouldShowPrompt = inBook ? isDifferentPage : (stored.scrollY > 100 || stored.hash);

      if (shouldShowPrompt) {
        const message = isDifferentPage
          ? `You were reading a different chapter ${formatTimestamp(stored.timestamp)}. Would you like to return to where you were?`
          : `You visited this page ${formatTimestamp(stored.timestamp)}. Would you like to return to where you were?`;

        showPrompt(message,
          () => {
            window.removeEventListener('beforeunload', handleNavigation);
            markSessionActive();
            if (isDifferentPage) {
              window.location.href = storedPath + (stored.hash || '');
            } else {
              restoreScrollPosition(stored);
            }
          },
          () => {
            window.removeEventListener('beforeunload', handleNavigation);
            markSessionActive();
            clearStoredPosition();
          }
        );
      } else if (inBook && !isDifferentPage) {
        window.removeEventListener('beforeunload', handleNavigation);
        markSessionActive();
        restoreScrollPosition(stored);
      } else if (!inBook && !isDifferentPage) {
        restoreScrollPosition(stored);
      }
    } else if (sessionActive && stored) {
      const currentPath = window.location.pathname;
      const storedPath = stored.url || currentPath;
      if (currentPath === storedPath) {
        restoreScrollPosition(stored);
      }
    }

    setupScrollTracking();
  }

  /**
   * Top-level initialiser.
   */
  function init() {
    if (!LOCAL_STORAGE_OK) {
      console.warn('Remember: localStorage is unavailable; navigation persistence is disabled for this session.');
      return;
    }
    if (isExcludedPage()) {
      return;
    }
    watchPageIdentifier();
    if (document.querySelector('.reveal')) {
      initRevealJS();
    } else {
      initHTML();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * Reveal.js plugin entry point.
 * The IIFE above already handles initialisation; this stub satisfies the
 * Reveal plugin contract so users can register `Remember` alongside other
 * plugins without errors.
 */
window.RevealRemember = function () {
  return {
    id: 'remember',
    init: function () {
      console.log('Remember plugin loaded for Reveal.js');
    }
  };
};
