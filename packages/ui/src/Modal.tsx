import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePortalContainer } from '@flarie/core';

/**
 * Portals into the container provided by the host. In an embed that is a node
 * INSIDE the shadow root, so the modal keeps Flarie's styles and never
 * leaks into (or gets styled by) the partner page.
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const container = usePortalContainer();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="fl-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="fl-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} part="modal">
        <h3 id={titleId} className="fl-modal-title">
          {title}
        </h3>
        {children}
      </div>
    </div>,
    container,
  );
}
