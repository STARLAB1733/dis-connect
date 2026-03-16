import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BinaryChoiceStep from './BinaryChoiceStep';

const options = [
  { id: 'opt-a', label: 'Prioritise speed of delivery' },
  { id: 'opt-b', label: 'Prioritise system stability' },
];

describe('BinaryChoiceStep', () => {
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onComplete = vi.fn();
  });

  it('renders all option labels', () => {
    render(<BinaryChoiceStep options={options} onComplete={onComplete} />);
    expect(screen.getByText('Prioritise speed of delivery')).toBeInTheDocument();
    expect(screen.getByText('Prioritise system stability')).toBeInTheDocument();
  });

  it('submit button is disabled before any selection', () => {
    render(<BinaryChoiceStep options={options} onComplete={onComplete} />);
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  it('submit button enables after selecting an option', async () => {
    const user = userEvent.setup();
    render(<BinaryChoiceStep options={options} onComplete={onComplete} />);
    await user.click(screen.getByText('Prioritise speed of delivery'));
    expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled();
  });

  it('calls onComplete with the selected option id', async () => {
    const user = userEvent.setup();
    render(<BinaryChoiceStep options={options} onComplete={onComplete} />);
    await user.click(screen.getByText('Prioritise speed of delivery'));
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith('opt-a');
  });

  it('submits the last selected option when changed before submit', async () => {
    const user = userEvent.setup();
    render(<BinaryChoiceStep options={options} onComplete={onComplete} />);
    await user.click(screen.getByText('Prioritise speed of delivery'));
    await user.click(screen.getByText('Prioritise system stability'));
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(onComplete).toHaveBeenCalledWith('opt-b');
  });

  it('prevents double-submit (isSubmitting guard)', async () => {
    const user = userEvent.setup();
    render(<BinaryChoiceStep options={options} onComplete={onComplete} />);
    await user.click(screen.getByText('Prioritise speed of delivery'));
    const btn = screen.getByRole('button', { name: /submit/i });
    await user.click(btn);
    await user.click(btn);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('button becomes disabled immediately after first submit', async () => {
    const user = userEvent.setup();
    render(<BinaryChoiceStep options={options} onComplete={onComplete} />);
    await user.click(screen.getByText('Prioritise speed of delivery'));
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });
});
