'use client';

import React, { useEffect, useState } from 'react';

export default function BackendTest() {
  const [message, setMessage] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/test');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setMessage(data.message);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <h2>Backend Test</h2>
      {error ? (
        <p>{error}</p>
      ) : (
        <p>{message}</p>
      )}
    </div>
  );
}
