'use client';

import { InteractiveNvlWrapper } from '@neo4j-nvl/react';

const nodes = [{ id: '1', title: 'Neo4j' }, { id: '2', title: 'Next.js' }];
const rels = [{ id: '10', from: '1', to: '2', title: 'Works with' }];

const GraphView = () => {
  return (
    <div className="h-[500px] w-full border border-zinc-200">
      <InteractiveNvlWrapper
        nodes={nodes} 
        rels={rels} 
        mouseEventCallbacks={{
          onNodeClick: (node) => console.log('Clicked:', node)
        }}
      />
    </div>
  );
}

export default GraphView;