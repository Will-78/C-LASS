import { render, screen, fireEvent } from '@testing-library/react';
import RelationshipMenu from '@/app/components/relationship-menu';

describe('RelationshipMenu', () => {
    const mockOnChange = jest.fn();
    const mockOnAdd = jest.fn();
    const mockOnCancel = jest.fn();
    const defaultProps = {
        draft: { from: '', caption: '', to: '' },
        onChange: mockOnChange,
        onAdd: mockOnAdd,
        onCancel: mockOnCancel,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        });

    it('renders input fields and buttons', () => {
        render(<RelationshipMenu {...defaultProps} />);
        expect(screen.getByPlaceholderText(/node caption source/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/relationship caption/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/node caption target/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /add relationship/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onChange when input fields are changed', () => {
        render(<RelationshipMenu {...defaultProps} />);
        fireEvent.change(screen.getByPlaceholderText(/node caption source/i), { target: { value: 'Node A' } });
        expect(mockOnChange).toHaveBeenCalledWith({ ...defaultProps.draft, from: 'Node A' });

        fireEvent.change(screen.getByPlaceholderText(/relationship caption/i), { target: { value: 'Related To' } });
        expect(mockOnChange).toHaveBeenCalledWith({ ...defaultProps.draft, caption: 'Related To' });

        fireEvent.change(screen.getByPlaceholderText(/node caption target/i), { target: { value: 'Node B' } });
        expect(mockOnChange).toHaveBeenCalledWith({ ...defaultProps.draft, to: 'Node B' });
    });

    it('calls onAdd when Add Relationship button is clicked', () => {
        render(<RelationshipMenu {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /add relationship/i }));
        expect(mockOnAdd).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel button is clicked', () => {
        render(<RelationshipMenu {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

});