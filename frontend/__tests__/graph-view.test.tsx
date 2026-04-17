import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent as rtlFireEvent, render, screen as rtlScreen, waitFor as rtlWaitFor } from '@testing-library/react';


// All the imports need to be mocked witin og file
const mockInteractiveNvlWrapper = jest.fn(({ nodes, rels, mouseEventCallbacks }: any) => (
  <div data-testid="graph-wrapper">
    <div data-testid="graph-nodes">{nodes.map((node: any) => node.caption).join(', ')}</div>
    <div data-testid="graph-rels">{rels.map((rel: any) => rel.caption).join(', ')}</div>
    <button type="button" onClick={() => mouseEventCallbacks.onCanvasClick({ clientX: 120, clientY: 240 })}>
      canvas-click
    </button>
    <button
      type="button"
      onClick={() => mouseEventCallbacks.onNodeClick({ id: 'node-1', caption: 'Alice', entryId: 'entry-1' }, {})}
    >
      node-click
    </button>
  </div>
));

jest.mock('@neo4j-nvl/react', () => ({
  InteractiveNvlWrapper: (props: any) => mockInteractiveNvlWrapper(props),
}));

jest.mock('../app/components/entity-view', () => (props: any) => (
  <div data-testid="entity-view">
    <div>{props.entity.caption}</div>
    <button type="button" onClick={() => props.onClose?.()}>
      close-entity
    </button>
    <button type="button" onClick={() => props.onSave?.({ ...props.entity, caption: 'Updated Entity' })}>
      save-entity
    </button>
    <button type="button" onClick={() => props.deleteEntity?.(props.entity)}>
      delete-entity
    </button>
  </div>
));

jest.mock('../app/components/graph-curation-menu', () => (props: any) => (
  <div data-testid="graph-curation-menu">
    <button type="button" onClick={props.onAddNode}>
      Add New Node
    </button>
    <button type="button" onClick={props.onAddRelationship}>
      Add New Relationship
    </button>
  </div>
));

jest.mock('../app/components/relationship-menu', () => (props: any) => (
  <div data-testid="relationship-menu">
    <input
      aria-label="from"
      value={props.draft.from}
      onChange={(event) => props.onChange({ ...props.draft, from: event.target.value })}
    />
    <input
      aria-label="caption"
      value={props.draft.caption}
      onChange={(event) => props.onChange({ ...props.draft, caption: event.target.value })}
    />
    <input
      aria-label="to"
      value={props.draft.to}
      onChange={(event) => props.onChange({ ...props.draft, to: event.target.value })}
    />
    <button type="button" onClick={props.onAdd}>
      Add Relationship
    </button>
    <button type="button" onClick={props.onCancel}>
      Cancel
    </button>
  </div>
));

jest.mock('../app/components/document-upload', () => (props: any) => (
  <div data-testid="document-upload">
    <button type="button" onClick={props.onFileUploadSuccess}>
      upload-success
    </button>
    <button type="button" onClick={props.onCancel}>
      cancel-upload
    </button>
  </div>
));

const GraphView = require('../app/components/graph-view').default;

describe('GraphView', () => {
  const graphResponse = {
    nodes: [
      {
        id: 'entry-1',
        labels: ['Person'],
        properties: {
          id: 'entry-1',
          name: 'Alice',
        },
      },
    ],
    edges: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('username', 'test-user');
    global.fetch = jest.fn(async (url: string) => {
      if (url === '/api/get-graph-info') {
        return {
          ok: true,
          json: async () => graphResponse,
        } as Response;
      }

      if (url === '/api/get-teacher-prompt') {
        return {
          ok: true,
          json: async () => ({ prompt: 'Be concise.' }),
        } as Response;
      }

      if (url === '/api/save-graph-info' || url === '/api/set-teacher-prompt') {
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      }

      return {
        ok: false,
        json: async () => ({}),
      } as Response;
    }) as jest.Mock;
  });

  it('loads the graph and teacher prompt on mount', async () => {
    render(<GraphView />);

    await rtlWaitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/get-graph-info');
    });

    expect(await rtlScreen.findByDisplayValue('Be concise.')).toBeInTheDocument();
  });

  it('opens the graph curation menu and adds a new node from the canvas callback', async () => {
    render(<GraphView />);

    await rtlWaitFor(() => {
      expect(rtlScreen.getByTestId('graph-wrapper')).toBeInTheDocument();
    });

    rtlFireEvent.click(rtlScreen.getByRole('button', { name: 'canvas-click' }));

    expect(await rtlScreen.findByTestId('graph-curation-menu')).toBeInTheDocument();

    rtlFireEvent.click(rtlScreen.getByRole('button', { name: 'Add New Node' }));

    await rtlWaitFor(() => {
      expect(rtlScreen.getByTestId('graph-nodes')).toHaveTextContent('New Entity');
    });

    expect(rtlScreen.queryByTestId('graph-curation-menu')).not.toBeInTheDocument();
    expect(rtlScreen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });

  it('saves graph changes and the teacher prompt', async () => {
    render(<GraphView />);

    await rtlWaitFor(() => {
      expect(rtlScreen.getByTestId('graph-wrapper')).toBeInTheDocument();
    });

    rtlFireEvent.click(rtlScreen.getByRole('button', { name: 'canvas-click' }));
    rtlFireEvent.click(await rtlScreen.findByRole('button', { name: 'Add New Node' }));

    rtlFireEvent.change(rtlScreen.getByPlaceholderText('Enter custom instructions...'), {
      target: { value: 'Keep it short.' },
    });

    rtlFireEvent.click(rtlScreen.getByRole('button', { name: /save changes/i }));

    await rtlWaitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/save-graph-info',
        expect.objectContaining({ method: 'POST' })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/set-teacher-prompt',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const fetchMock = global.fetch as jest.Mock;
    const saveCall = fetchMock.mock.calls.find((call: [string, RequestInit?]) => call[0] === '/api/save-graph-info');
    const promptCall = fetchMock.mock.calls.find((call: [string, RequestInit?]) => call[0] === '/api/set-teacher-prompt');

    expect(saveCall?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(JSON.parse(saveCall?.[1]?.body as string)).toMatchObject({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: '__Entity__:New Entity',
          properties: { name: 'New Entity' },
        }),
      ]),
      edges: [],
      entitiesToDelete: [],
    });

    expect(promptCall?.[1]).toEqual(
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(JSON.parse(promptCall?.[1]?.body as string)).toEqual({
      username: 'test-user',
      prompt: 'Keep it short.',
    });
  });
});