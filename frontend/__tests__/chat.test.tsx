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
});