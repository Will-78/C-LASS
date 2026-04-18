'use client';

import dynamic from 'next/dynamic';

const GraphView = dynamic(() => import('./graphview'), { 
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-zinc-100 animate-pulse" />
});

export default function GraphBridge() {
  return <GraphView />;
}