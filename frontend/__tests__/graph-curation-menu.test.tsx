import { render, screen, fireEvent } from '@testing-library/react';
import GraphCurationMenu from '@/app/components/graph-curation-menu';

describe('GraphCurationMenu', () => {
    const mockOnAddNode = jest.fn();
    const mockOnAddRelationship = jest.fn();
    const defaultProps = {
        position: { x: 100, y: 200 },
        onAddNode: mockOnAddNode,
        onAddRelationship: mockOnAddRelationship,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders Add New Node button', () => {
        render(<GraphCurationMenu {...defaultProps} />);
        expect(screen.getByRole('button', { name: /add new node/i })).toBeInTheDocument();
    });

    it('renders Add New Relationship button', () => {
        render(<GraphCurationMenu {...defaultProps} />);
        expect(screen.getByRole('button', { name: /add new relationship/i })).toBeInTheDocument();
    });

    it('calls onAddNode when Add New Node button is clicked', () => {
        render(<GraphCurationMenu {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /add new node/i }));
        expect(mockOnAddNode).toHaveBeenCalledTimes(1);
    });

    it('calls onAddRelationship when Add New Relationship button is clicked', () => {
        render(<GraphCurationMenu {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /add new relationship/i }));
        expect(mockOnAddRelationship).toHaveBeenCalledTimes(1);
    });

    it('stops propagation when menu is clicked', () => {
        const parentClick = jest.fn();
        render(
            <div onClick={parentClick}>
            <GraphCurationMenu {...defaultProps} />
            </div>
        );

        fireEvent.click(screen.getByText('Actions'));
        expect(parentClick).not.toHaveBeenCalled();
    });
});