import logoSrc from '../assets/galmae-farm-logo.svg';
import { useCallback, useEffect, useRef, useState } from 'react';

export function Logo() {
  return <img className="logo" src={logoSrc} alt="갈매농장" width={1108} height={350} />;
}

export function useToast() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<number>(0);
  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 2600);
  }, []);
  const node = (
    <div className={`toast${show ? ' show' : ''}`} id="toast" role="status" aria-live="polite">
      {msg}
    </div>
  );
  return { toast, node };
}

export function usePage(page: string, bodyClass = '') {
  useEffect(() => {
    document.body.dataset.page = page;
    document.body.className = bodyClass;
    return () => {
      delete document.body.dataset.page;
      document.body.className = '';
    };
  }, [page, bodyClass]);
}

export function useDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  return {
    ref,
    open: () => { if (ref.current && !ref.current.open) ref.current.showModal(); },
    close: () => ref.current?.close(),
  };
}
