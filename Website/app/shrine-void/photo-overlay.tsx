'use client';

import React, { useEffect, useRef } from 'react';

interface PhotoOverlayProps {
  activeIndex: number;     // -1 if no active photo
  photoSrc?: string;       // URL of active photo
  photoCaption?: string;   // Caption text
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export default function PhotoOverlay({
  activeIndex,
  photoSrc,
  photoCaption,
  onClose,
  onNext,
  onPrev
}: PhotoOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = activeIndex !== -1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeIndex === -1) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' && onNext) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, onClose, onNext, onPrev]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    if (open && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        dialogRef.current.focus();
      }
    }
    return () => { if (open && previous?.isConnected) requestAnimationFrame(() => previous.focus({preventScroll:true})); };
  }, [open]);

  if (activeIndex === -1) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo view"
      tabIndex={-1}
      className="photo-overlay-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease-in-out',
        color: 'white'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '2.5rem',
          cursor: 'pointer',
          zIndex: 1001,
          padding: '10px'
        }}
      >
        &times;
      </button>

      {onPrev && (
        <button
          onClick={onPrev}
          aria-label="Previous photo"
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '4rem',
            cursor: 'pointer',
            zIndex: 1001,
            opacity: 0.7,
            padding: '20px'
          }}
        >
          &#8249;
        </button>
      )}

      {onNext && (
        <button
          onClick={onNext}
          aria-label="Next photo"
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '4rem',
            cursor: 'pointer',
            zIndex: 1001,
            opacity: 0.7,
            padding: '20px'
          }}
        >
          &#8250;
        </button>
      )}

      {photoSrc && (
        <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }}>
          <img
            src={photoSrc}
            alt={photoCaption || "Photo details"}
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain'
              // Natural HTML colors display fine, toneMapped=false equivalent.
            }}
          />
        </div>
      )}

      {photoCaption && (
        <div
          style={{
            marginTop: '20px',
            fontSize: '1.2rem',
            textAlign: 'center',
            maxWidth: '80%',
            fontFamily: 'serif',
            lineHeight: 1.5,
            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          }}
        >
          {photoCaption}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
