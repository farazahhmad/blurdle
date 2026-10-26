import { useState, useEffect } from 'react';

const CLIENT_ID_KEY = 'pixel-frame-client-id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useClientId(): string {
  const [clientId, setClientId] = useState<string>(() => {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  });

  useEffect(() => {
    const stored = localStorage.getItem(CLIENT_ID_KEY);
    if (!stored) {
      const newId = generateUUID();
      localStorage.setItem(CLIENT_ID_KEY, newId);
      setClientId(newId);
    }
  }, []);

  return clientId;
}
