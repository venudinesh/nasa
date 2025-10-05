import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, beforeEach, vi, expect } from 'vitest';
import AdminPanel from '../src/components/AdminPanel';

// Provide a simple wrapper so the component thinks it's in dev
Object.defineProperty(window, 'location', {
  value: { hostname: 'localhost' },
  writable: true,
});

describe('AdminPanel', () => {
  beforeEach(() => {
    // reset fetch mocks
    (global as any).fetch = undefined;
  });

  it('renders and shows validation when empty session id', async () => {
    render(<AdminPanel onClose={() => {}} />);
    const fetchBtn = screen.getByText('Fetch');
    fireEvent.click(fetchBtn);
    expect(await screen.findByText(/Enter a session id/i)).toBeInTheDocument();
  });

  it('fetches and displays a session', async () => {
    const mock = { data: { assistant: [{ id: 'a1', content: 'Hello', ts: 1600000000000 }], embeddingsCount: 1 } };
    (global as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mock });

    render(<AdminPanel onClose={() => {}} />);
    const input = screen.getByPlaceholderText('session id');
    fireEvent.change(input, { target: { value: 'sess1' } });
    fireEvent.click(screen.getByText('Fetch'));

    await waitFor(() => expect(screen.getByText(/Embeddings count:/i)).toBeInTheDocument());
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  it('shows not-found error when server returns 404', async () => {
    (global as any).fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'session not found' }) });
    render(<AdminPanel onClose={() => {}} />);
    const input = screen.getByPlaceholderText('session id');
    fireEvent.change(input, { target: { value: 'missing' } });
    fireEvent.click(screen.getByText('Fetch'));
    expect(await screen.findByText(/session not found/i)).toBeInTheDocument();
  });

  it('deletes a session successfully', async () => {
    // confirm uses window.confirm — stub it
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    (global as any).fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { deleted: true } }) });
    render(<AdminPanel onClose={() => {}} />);
    const input = screen.getByPlaceholderText('session id');
    fireEvent.change(input, { target: { value: 'to-delete' } });
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });
});
