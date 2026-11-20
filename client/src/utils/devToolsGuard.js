/**
 * DevTools Guard — production only.
 * - Strips console.log/info/debug/warn in prod
 * - Shows a styled warning in the console
 * - Detects DevTools open via window size diff and forces logout
 * - Disables right-click context menu and inspection shortcuts
 */
export function initDevToolsGuard() {
  if (!import.meta.env.PROD) return;

  // 1. Disable right-click
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // 2. Disable F12 and Ctrl+Shift+I / Cmd+Option+I / Ctrl+Shift+J / Ctrl+Shift+C
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
      (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()))
    ) {
      e.preventDefault();
    }
  });

  // 3. Console warning message
  const style1 = 'color: #ef4444; font-size: 36px; font-weight: bold; -webkit-text-stroke: 1px black;';
  const style2 = 'color: #374151; font-size: 14px; font-weight: 500; line-height: 1.5;';
  console.log('%c⚠️ STOP!', style1);
  console.log(
    '%cThis is a browser feature intended for developers. If someone told you to copy-paste code here, it is a scam and may compromise your payroll data.\nAll unauthorized access attempts are monitored and recorded.',
    style2
  );

  // 4. Override console methods to no-ops in production
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;

  // 5. Detect DevTools open via window outer/inner dimension difference
  let devToolsOpen = false;
  setInterval(() => {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    if ((widthDiff || heightDiff) && !devToolsOpen) {
      devToolsOpen = true;
      window.dispatchEvent(new Event('auth:logout'));
    }
    if (!widthDiff && !heightDiff) {
      devToolsOpen = false;
    }
  }, 2000);
}
