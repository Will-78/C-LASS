import { render, screen } from '@testing-library/react'
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
    return <div>{children}</div>;
  };
});

// Mock only the initial data fetch used on Home load
const setupFetchMock = () => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => [],
  })) as jest.Mock;
};

// Test home page
describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFetchMock();
  });

  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/enter message/i)).toBeInTheDocument();
  });
});
