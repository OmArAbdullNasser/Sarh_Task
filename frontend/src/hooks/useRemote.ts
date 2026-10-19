import { useEffect, useState } from 'react';
import { api } from '../api/client';

/** Each URL owns its result. Abort saves work; the cleanup guard also handles transports ignoring abort. */
export function useRemote<T>(url: string | null) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ url: string | null; data?: T; error?: unknown; loading: boolean }>({ url: null, loading: !!url });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let current = true;
    setState({ url, loading: true });
    api<T>(url, { signal: controller.signal }).then(
      data => { if (current) setState({ url, data, loading: false }); },
      error => { if (current) setState({ url, error, loading: false }); },
    );
    return () => { current = false; controller.abort(); };
  }, [url, revision]);
  // Never show a previous URL's rows, even in the render before effect cleanup executes.
  const visible = state.url === url ? state : { url, loading: !!url };
  return { ...visible, retry: () => setRevision(v => v + 1) };
}
