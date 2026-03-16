import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock chart dependencies — jsdom has no canvas
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: class {},
  LinearScale: class {},
  BarElement: class {},
  Title: class {},
  Tooltip: class {},
  Legend: class {},
}));
vi.mock('react-chartjs-2', () => ({ Bar: () => null }));

import NumericInputStep from './NumericInputStep';

const defaultProps = {
  chartData: [10, 20, 30],
  expected: 50,
  tolerance: 10,
  onComplete: vi.fn(),
};

describe('NumericInputStep', () => {
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onComplete = vi.fn();
  });

  it('submit button is disabled when input is empty', () => {
    render(<NumericInputStep {...defaultProps} onComplete={onComplete} />);
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('submit button enables after typing a number', async () => {
    const user = userEvent.setup();
    render(<NumericInputStep {...defaultProps} onComplete={onComplete} />);
    await user.type(screen.getByPlaceholderText(/prediction/i), '42');
    expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled();
  });

  it('submit button stays disabled when non-numeric text is typed (type=number rejects it)', async () => {
    // type="number" inputs silently discard alphabetical characters;
    // the value stays empty so the submit button remains disabled.
    const user = userEvent.setup();
    render(<NumericInputStep {...defaultProps} onComplete={onComplete} />);
    await user.type(screen.getByPlaceholderText(/prediction/i), 'abc');
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows error and does not submit for negative value', async () => {
    const user = userEvent.setup();
    render(<NumericInputStep {...defaultProps} onComplete={onComplete} />);
    await user.type(screen.getByPlaceholderText(/prediction/i), '-5');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/negative/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete with userValue on valid submission', async () => {
    const user = userEvent.setup();
    render(<NumericInputStep {...defaultProps} onComplete={onComplete} />);
    await user.type(screen.getByPlaceholderText(/prediction/i), '50');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(onComplete).toHaveBeenCalledWith({ userValue: 50 });
  });

  it('accepts zero as a valid value', async () => {
    const user = userEvent.setup();
    render(<NumericInputStep {...defaultProps} onComplete={onComplete} />);
    await user.type(screen.getByPlaceholderText(/prediction/i), '0');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(onComplete).toHaveBeenCalledWith({ userValue: 0 });
  });

  it('clears the error message when user edits after an invalid submit', async () => {
    const user = userEvent.setup();
    render(<NumericInputStep {...defaultProps} onComplete={onComplete} />);
    await user.type(screen.getByPlaceholderText(/prediction/i), '-1');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/negative/i)).toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText(/prediction/i));
    await user.type(screen.getByPlaceholderText(/prediction/i), '5');
    expect(screen.queryByText(/negative/i)).not.toBeInTheDocument();
  });

  it('prevents double-submit (isSubmitting guard)', async () => {
    const user = userEvent.setup();
    render(<NumericInputStep {...defaultProps} onComplete={onComplete} />);
    await user.type(screen.getByPlaceholderText(/prediction/i), '50');
    const btn = screen.getByRole('button', { name: /submit/i });
    await user.click(btn);
    await user.click(btn);
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
