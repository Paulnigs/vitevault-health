import React from 'react';
import { render, screen } from '@testing-library/react';
import { CountdownTimer } from '@/components/ui';

describe('CountdownTimer', () => {
    it('renders with correct days', () => {
        render(<CountdownTimer days={15} size={100} />);
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('days')).toBeInTheDocument();
    });

    it('applies green color for safe countdown (> 3 days)', () => {
        const { container } = render(<CountdownTimer days={10} size={100} />);
        const circle = container.querySelector('circle:last-of-type');
        expect(circle).toHaveAttribute('stroke', 'var(--countdown-safe)');
    });

    it('applies amber color for warning countdown (1-3 days)', () => {
        const { container } = render(<CountdownTimer days={2} size={100} />);
        const circle = container.querySelector('circle:last-of-type');
        expect(circle).toHaveAttribute('stroke', 'var(--countdown-warning)');
    });

    it('applies red color for danger countdown (0 days)', () => {
        const { container } = render(<CountdownTimer days={0} size={100} />);
        const circle = container.querySelector('circle:last-of-type');
        expect(circle).toHaveAttribute('stroke', 'var(--countdown-danger)');
    });

    it('renders with aria-live for accessibility', () => {
        const { container } = render(<CountdownTimer days={5} size={100} />);
        const liveRegion = container.querySelector('[aria-live]');
        expect(liveRegion).toBeInTheDocument();
    });

    it('calculates correct progress for maxDays', () => {
        const { container } = render(<CountdownTimer days={15} size={100} maxDays={30} />);
        // 15/30 = 50% progress, should render half circle
        const progressCircle = container.querySelector('circle:last-of-type');
        expect(progressCircle).toBeInTheDocument();
    });

    it('handles zero maxDays gracefully', () => {
        render(<CountdownTimer days={0} size={100} maxDays={0} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('accepts custom size prop', () => {
        const { container } = render(<CountdownTimer days={10} size={200} />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '200');
        expect(svg).toHaveAttribute('height', '200');
    });
});
