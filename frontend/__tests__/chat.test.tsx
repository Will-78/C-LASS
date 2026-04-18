import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TextDecoder as NodeTextDecoder } from 'util'
import Home from '../app/page'
import React from 'react'

// Mock Next.js Navigation (App Router)
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
}));

// Mock react-markdown (prevents ESM/CJS version conflicts in Jest)
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: React.ReactNode }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

// Polyfill TextDecoder (Required for testing streaming responses in Jest)
if (typeof global.TextDecoder === 'undefined') {
  Object.defineProperty(global, 'TextDecoder', {
    value: NodeTextDecoder,
  });
}

// Mock generate_response API endpoint
const setupFetchMock = (responseChunks: string[] = ['Mock ', 'response']) => {
  const streamChunks = responseChunks.map(chunk => Uint8Array.from(Buffer.from(chunk)));
  let readIndex = 0;

  global.fetch = jest.fn((url: string) => {
    // Handle Chat History/User initialization calls
    if (url.includes('/api/get-user-chats') || url.includes('/api/get-chat-history')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url.includes('/api/create-chat')) {
      return Promise.resolve({ ok: true, json: async () => ({ chat_id: 123 }) });
    }

    // Handle the AI Generation Stream
    if (url.includes('/api/generate_response')) {
      return Promise.resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (readIndex < streamChunks.length) {
                const value = streamChunks[readIndex];
                readIndex++;
                return { value, done: false };
              }
              return { value: undefined, done: true };
            },
          }),
        },
      } as any);
    }

    return Promise.resolve({ ok: false, json: async () => ({}) });
  }) as jest.Mock;
};

// Test chat
describe('Chat Response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('username', 'test-user');
    setupFetchMock();
  });

  it('adds a message and shows assistant response when Enter is pressed', async () => {
    render(<Home />);

    const input = screen.getByPlaceholderText(/enter message/i);

    fireEvent.change(input, { target: { value: 'How does DFS work?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText(/Mock response/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('loads persistent chats from dropdown and resets to new chat when selected', async () => {
    const chatList = [
      { chat_id: 1, title: 'Saved Chat One' },
      { chat_id: 2, title: 'Saved Chat Two' },
    ];
    const chatHistoryById: Record<number, { role: 'user' | 'assistant'; content: string }[]> = {
      1: [{ role: 'assistant', content: 'Persistent chat response' }],
      2: [{ role: 'assistant', content: 'Second saved response' }],
    };

    global.fetch = jest.fn((url: string, options?: RequestInit) => {
      if (url.includes('/api/get-user-chats')) {
        return Promise.resolve({ ok: true, json: async () => chatList });
      }

      if (url.includes('/api/get-chat-history')) {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        return Promise.resolve({
          ok: true,
          json: async () => chatHistoryById[body.chat_id] || [],
        });
      }

      if (url.includes('/api/create-chat')) {
        return Promise.resolve({ ok: true, json: async () => ({ chat_id: 123 }) });
      }

      return Promise.resolve({ ok: false, json: async () => ({}) });
    }) as jest.Mock;

    render(<Home />);

    const chatSelect = await screen.findByRole('combobox');
    expect(await screen.findByRole('option', { name: 'Saved Chat One' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Saved Chat Two' })).toBeInTheDocument();

    fireEvent.change(chatSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/get-chat-history',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ chat_id: 1 }),
        })
      );
    });

    expect(await screen.findByText('Persistent chat response')).toBeInTheDocument();

    fireEvent.change(chatSelect, { target: { value: 'new' } });

    await waitFor(() => {
      expect(screen.getByText(/start a new chat/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Persistent chat response')).not.toBeInTheDocument();
  });
});
