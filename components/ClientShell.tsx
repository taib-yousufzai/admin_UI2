'use client';

import React from 'react';
import AnimatedLoader from '@/components/AnimatedLoader';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [isGlobalLoading, setIsGlobalLoading] = React.useState(false);
  const [loadingText, setLoadingText] = React.useState('Processing...');

  // Global toast for notifications
  const [toastMsg, setToastMsg] = React.useState('');
  const [toastVisible, setToastVisible] = React.useState(false);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const onStart = (e: any) => {
      setLoadingText(e.detail || 'Processing...');
      setIsGlobalLoading(true);
    };
    const onEnd = () => setIsGlobalLoading(false);

    const onToast = (e: any) => {
      const msg = (e as CustomEvent).detail;
      if (!msg) return;
      setToastMsg(String(msg));
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
    };

    window.addEventListener('global-loader-start', onStart);
    window.addEventListener('global-loader-end', onEnd);
    window.addEventListener('toast_msg', onToast);
    return () => {
      window.removeEventListener('global-loader-start', onStart);
      window.removeEventListener('global-loader-end', onEnd);
      window.removeEventListener('toast_msg', onToast);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <>
      {isGlobalLoading && (
        <AnimatedLoader fullScreen={true} text={loadingText} />
      )}
      {children}

      {/* Global toast */}
      <div
        className={`global-toast${toastVisible ? ' show' : ''}`}
        style={{
          position: 'fixed',
          bottom: 40,
          left: '50%',
          transform: `translateX(-50%) translateY(${toastVisible ? 0 : 20}px)`,
          background: '#1F2937',
          color: '#fff',
          padding: '10px 22px',
          borderRadius: 30,
          fontSize: '0.84rem',
          fontWeight: 600,
          zIndex: 200000,
          opacity: toastVisible ? 1 : 0,
          transition: 'opacity 0.3s, transform 0.3s',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          maxWidth: '90vw',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        {toastMsg}
      </div>
    </>
  );
}
