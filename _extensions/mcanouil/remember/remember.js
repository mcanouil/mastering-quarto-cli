/**
 * Remember Extension - Navigation Position Persistence
 * Saves and restores user's scroll position and current anchor/slide
 *
 * @author Mickaël Canouil
 * @version 1.0.0
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'quarto-remember-position';
  const STORAGE_TIMESTAMP_KEY = 'quarto-remember-timestamp';
  const PROMPT_SHOWN_KEY = 'quarto-remember-prompt-shown';
  const SESSION_ACTIVE_KEY = 'quarto-remember-session-active';
  const PROMPT_COOLDOWN = 5000; // 5 seconds cooldown between prompts

  /**
   * Check if current page is a Quarto book
   * @returns {boolean} True if current page is part of a Quarto book
   */
  function isQuartoBook() {
    const hasPageNav = document.querySelector('.page-navigation');
    const hasNavSidebar = document.body && document.body.classList.contains('nav-sidebar');
    return hasPageNav && hasNavSidebar;
  }

  /**
   * Get page identifier - use book root for Quarto books, pathname otherwise
   * @returns {string} Page identifier
   */
  function getPageIdentifier() {
    if (isQuartoBook()) {
      // For books, use the directory path (book root) so all chapters share position
      const pathname = window.location.pathname;
      const parts = pathname.split('/');
      // Remove the last part (filename) to get the book directory
      parts.pop();
      return parts.join('/') || '/';
    }

    // For regular pages, use full pathname
    return window.location.pathname;
  }

  // Page identifier will be computed when needed (not at script load time)
  let PAGE_IDENTIFIER = null;
  function ensurePageIdentifier() {
    if (PAGE_IDENTIFIER === null) {
      PAGE_IDENTIFIER = getPageIdentifier();
    }
    return PAGE_IDENTIFIER;
  }

  /**
   * Get stored navigation data from localStorage
   * @returns {Object|null} Stored position data or null
   */
  function getStoredPosition() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

      if (data && timestamp) {
        const position = JSON.parse(data);
        // Only return if it's for the current page/book
        if (position.page === ensurePageIdentifier()) {
          return {
            ...position,
            timestamp: parseInt(timestamp, 10)
          };
        }
      }
    } catch (e) {
      console.error('Remember: Failed to retrieve stored position', e);
    }
    return null;
  }

  /**
   * Save navigation position to localStorage
   * @param {Object} position - Position data to save
   */
  function savePosition(position) {
    try {
      const data = {
        page: ensurePageIdentifier(),
        url: window.location.pathname, // Store actual page URL for books
        scrollY: position.scrollY || 0,
        hash: position.hash || '',
        slideIndices: position.slideIndices || null
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.error('Remember: Failed to save position', e);
    }
  }

  /**
   * Clear stored position from localStorage
   */
  function clearStoredPosition() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
    } catch (e) {
      console.error('Remember: Failed to clear stored position', e);
    }
  }

  /**
   * Check if prompt was recently shown (within cooldown period)
   * @returns {boolean} True if prompt was recently shown
   */
  function wasPromptRecentlyShown() {
    try {
      const lastShown = sessionStorage.getItem(PROMPT_SHOWN_KEY);
      if (lastShown) {
        const timeSinceShown = Date.now() - parseInt(lastShown, 10);
        return timeSinceShown < PROMPT_COOLDOWN;
      }
    } catch (e) {
      // sessionStorage not available
    }
    return false;
  }

  /**
   * Mark prompt as shown with current timestamp
   */
  function markPromptShown() {
    try {
      sessionStorage.setItem(PROMPT_SHOWN_KEY, Date.now().toString());
    } catch (e) {
      // sessionStorage not available
    }
  }

  /**
   * Create and display modal prompt
   * @param {string} message - Message to display
   * @param {Function} onAccept - Callback when user accepts
   * @param {Function} onDecline - Callback when user declines
   */
  function showPrompt(message, onAccept, onDecline) {
    // Check if prompt was recently shown
    if (wasPromptRecentlyShown()) {
      return;
    }

    // Mark prompt as shown
    markPromptShown();

    // Store currently focused element to restore later
    const previouslyFocused = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'remember-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'remember-prompt-title');
    overlay.setAttribute('aria-describedby', 'remember-prompt-message');
    overlay.setAttribute('aria-live', 'assertive');

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

    // Shared cleanup function to prevent memory leaks
    const cleanup = () => {
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
      document.removeEventListener('keydown', handleKeydown);

      // Restore focus to previously focused element
      if (previouslyFocused && previouslyFocused.focus) {
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

    // Get all focusable elements for focus trap
    const getFocusableElements = () => {
      return [declineBtn, acceptBtn];
    };

    // Handle keyboard navigation
    const handleKeydown = (e) => {
      // Escape key
      if (e.key === 'Escape') {
        cleanup();
        onDecline();
        return;
      }

      // Tab key - trap focus within modal
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          // Shift+Tab on first element - go to last
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          // Tab on last element - go to first
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Button order: Decline first (safer default), Accept last (primary action)
    buttonContainer.appendChild(declineBtn);
    buttonContainer.appendChild(acceptBtn);

    modal.appendChild(title);
    modal.appendChild(text);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);

    // Focus the decline button (safer default action)
    // Users can Tab to Accept if they want to resume
    declineBtn.focus();

    // Add keyboard handlers
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Format timestamp for display
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string} Formatted time string
   */
  function formatTimestamp(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  /**
   * Restore scroll position for regular HTML pages
   * @param {Object} position - Position data
   */
  function restoreScrollPosition(position) {
    if (!position) {
      return;
    }

    if (position.hash) {
      // Navigate to hash
      window.location.hash = position.hash;
    } else if (position.scrollY && typeof position.scrollY === 'number') {
      // Restore scroll position with smooth behaviour (unless user prefers reduced motion)
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: position.scrollY,
        left: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }
  }

  /**
   * Save scroll position periodically for regular HTML pages
   */
  function setupScrollTracking() {
    let saveTimeout;

    const saveCurrentPosition = () => {
      const position = {
        scrollY: window.scrollY,
        hash: window.location.hash
      };
      savePosition(position);
    };

    // For books, save position on page load (even if scroll is 0)
    // This ensures we track which page the user is on
    if (isQuartoBook()) {
      saveCurrentPosition();
    }

    // Save on scroll (debounced)
    window.addEventListener('scroll', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveCurrentPosition, 500);
    }, { passive: true });

    // Save on hash change
    window.addEventListener('hashchange', saveCurrentPosition);

    // Save on link clicks (for tracking navigation intent in single-page documents)
    document.addEventListener('click', (e) => {
      // Check if clicked element is or contains a link
      const link = e.target.closest('a');
      if (link && link.href) {
        // Save current position before navigation
        saveCurrentPosition();
      }
    }, { passive: true });

    // Save before unload (single listener)
    window.addEventListener('beforeunload', saveCurrentPosition);
  }

  /**
   * Initialise for Reveal.js presentations
   */
  function initRevealJS() {
    // Wait for Reveal to be ready
    if (typeof Reveal === 'undefined') {
      console.warn('Remember: Reveal.js not found');
      return;
    }

    Reveal.on('ready', () => {
      const stored = getStoredPosition();

      if (stored && stored.slideIndices) {
        const message = `You left this presentation ${formatTimestamp(stored.timestamp)}. Would you like to resume where you left off?`;

        showPrompt(
          message,
          () => {
            // Restore slide position
            Reveal.slide(stored.slideIndices.h, stored.slideIndices.v, stored.slideIndices.f);
          },
          () => {
            // Clear stored position
            clearStoredPosition();
          }
        );
      }

      // Save position on slide change
      Reveal.on('slidechanged', () => {
        const indices = Reveal.getIndices();
        savePosition({ slideIndices: indices });
      });

      // Save before unload
      window.addEventListener('beforeunload', () => {
        const indices = Reveal.getIndices();
        savePosition({ slideIndices: indices });
      });
    });
  }

  /**
   * Check if this is an active session (user navigating within the session)
   * @returns {boolean} True if session is active
   */
  function isSessionActive() {
    try {
      const sessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY);
      return sessionActive === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Mark session as active
   */
  function markSessionActive() {
    try {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    } catch (e) {
      // sessionStorage not available
    }
  }

  /**
   * Initialise for regular HTML pages
   */
  function initHTML() {
    const stored = getStoredPosition();
    const sessionActive = isSessionActive();
    const isBook = isQuartoBook();

    // Detect if user navigates to another page before responding to prompt
    // This applies whether the prompt was shown or not
    const handleNavigation = () => {
      // Mark session as active when user navigates
      markSessionActive();
      // Clear stored position if navigating without responding to prompt
      if (stored) {
        clearStoredPosition();
      }
    };

    // Listen for navigation events
    window.addEventListener('beforeunload', handleNavigation);

    // Check if we should show a prompt
    if (stored && !sessionActive) {
      const currentPath = window.location.pathname;
      const storedPath = stored.url || currentPath;
      const isDifferentPage = currentPath !== storedPath;

      // For books: only prompt if on a different page
      // For regular pages: prompt if scrollY > 100 or there's a hash
      const shouldShowPrompt = isBook ? isDifferentPage : (stored.scrollY > 100 || stored.hash);

      if (shouldShowPrompt) {
        const message = isDifferentPage
          ? `You were reading a different chapter ${formatTimestamp(stored.timestamp)}. Would you like to return to where you were?`
          : `You visited this page ${formatTimestamp(stored.timestamp)}. Would you like to return to where you were?`;

        showPrompt(
          message,
          () => {
            // Remove navigation listener since user responded
            window.removeEventListener('beforeunload', handleNavigation);
            // Mark session as active after user accepts
            markSessionActive();

            if (isDifferentPage) {
              // Different page in the same book - redirect after user accepts
              const targetUrl = storedPath + (stored.hash || '');
              window.location.href = targetUrl;
            } else {
              // Same page - restore position
              restoreScrollPosition(stored);
            }
          },
          () => {
            // Remove navigation listener since user responded
            window.removeEventListener('beforeunload', handleNavigation);
            // Mark session as active after user declines
            markSessionActive();
            // Clear stored position
            clearStoredPosition();
          }
        );
      } else if (isBook && !isDifferentPage) {
        // In a book, already on the stored page - mark session active and restore silently
        // Mark session first to prevent race condition with navigation listener
        window.removeEventListener('beforeunload', handleNavigation);
        markSessionActive();
        restoreScrollPosition(stored);
      } else if (!isBook && !isDifferentPage) {
        // Regular page, same location but scrollY < 100 - just restore position silently
        restoreScrollPosition(stored);
      }
    } else if (sessionActive && stored) {
      // Session is active, don't show prompt but restore position silently if on same page
      const currentPath = window.location.pathname;
      const storedPath = stored.url || currentPath;
      if (currentPath === storedPath) {
        restoreScrollPosition(stored);
      }
    }

    // Set up tracking for future visits
    setupScrollTracking();
  }

  /**
   * Initialise the Remember extension
   */
  function init() {
    // Check if we're in a Reveal.js presentation
    if (document.querySelector('.reveal')) {
      initRevealJS();
    } else {
      initHTML();
    }
  }

  // Initialise when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

/**
 * Reveal.js Plugin Interface
 * Provides the plugin interface for Reveal.js integration
 */
window.RevealRemember = function () {
  return {
    id: 'remember',
    init: function () {
      // The main initialisation is handled by the IIFE above
      // This just provides the plugin interface for Reveal.js
      console.log('Remember plugin loaded for Reveal.js');
    }
  };
};
