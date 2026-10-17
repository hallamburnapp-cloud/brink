/**
 * Browser chrome that must not leak into the game: the context menu (a right-click on desktop, a
 * long-press in some mobile browsers, which would break the tap-and-hold), the long-press callout
 * and iOS Safari's pinch zoom, which ignores the viewport's user-scalable=no. Returns the uninstaller.
 */
export function installBrowserGuards(root: HTMLElement): () => void {
  const onContextMenu = (e: Event) => {
    if (e.target instanceof Node && root.contains(e.target)) e.preventDefault();
  };
  const onGesture = (e: Event) => e.preventDefault();
  const active: AddEventListenerOptions = { passive: false };
  window.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('gesturestart', onGesture, active);
  document.addEventListener('gesturechange', onGesture, active);
  return () => {
    window.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('gesturestart', onGesture, active);
    document.removeEventListener('gesturechange', onGesture, active);
  };
}
