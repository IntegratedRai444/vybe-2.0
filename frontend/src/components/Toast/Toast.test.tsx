import React from 'react';
import { render, screen, fireEvent, act, RenderOptions } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';
import { AllTheProviders, render as customRender } from './__tests__/test-utils';

// Test component that uses the toast
const TestComponent = () => {
  const { toast } = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show Success</button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.warning('Warning message')}>Show Warning</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.success('Custom Toast', { title: 'Title', duration: 1000 })}>
        Show Custom Toast
      </button>
    </div>
  );
};

describe('Toast Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders without crashing', () => {
    customRender(
      <div>Test</div>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('shows a success toast when triggered', async () => {
    customRender(<TestComponent />);

    fireEvent.click(screen.getByText('Show Success'));
    expect(await screen.findByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('motion-div')).toHaveClass('bg-white');
  });

  it('shows an error toast when triggered', async () => {
    customRender(<TestComponent />);

    fireEvent.click(screen.getByText('Show Error'));
    expect(await screen.findByText('Error message')).toBeInTheDocument();
  });

  it('auto-dismisses after default duration', async () => {
    customRender(<TestComponent />);

    fireEvent.click(screen.getByText('Show Success'));
    expect(await screen.findByText('Success message')).toBeInTheDocument();
    
    // Fast-forward time to just before auto-dismissal
    act(() => {
      jest.advanceTimersByTime(4900);
    });
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    
    // Fast-forward to after auto-dismissal
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('respects custom duration', async () => {
    customRender(<TestComponent />);

    fireEvent.click(screen.getByText('Show Custom Toast'));
    expect(await screen.findByText('Custom Toast')).toBeInTheDocument();
    
    // Fast-forward time to just before custom duration
    act(() => {
      jest.advanceTimersByTime(900);
    });
    
    expect(screen.getByText('Custom Toast')).toBeInTheDocument();
    
    // Fast-forward to after custom duration
    act(() => {
      jest.advanceTimersByTime(200);
    });
    
    expect(screen.queryByText('Custom Toast')).not.toBeInTheDocument();
  });

  it('can be manually dismissed', async () => {
    customRender(<TestComponent />);

    fireEvent.click(screen.getByText('Show Success'));
    expect(await screen.findByText('Success message')).toBeInTheDocument();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('supports toast with title', async () => {
    render(<TestComponent />, { wrapper: AllTheProviders });

    fireEvent.click(screen.getByText('Show Custom Toast'));
    expect(await screen.findByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Toast')).toBeInTheDocument();
  });

  it('supports different positions', async () => {
    const { container } = render(
      <TestComponent />,
      { 
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <ToastProvider defaultPosition="top-left">
            {children}
          </ToastProvider>
        )
      } as RenderOptions
    );

    fireEvent.click(screen.getByText('Show Success'));
    
    // Check if the toast container has the correct position class
    const containerDiv = container.querySelector('.fixed.top-4.left-4');
    expect(containerDiv).toBeInTheDocument();
  });

  it('calls onClose callback when toast is dismissed', async () => {
    const onClose = jest.fn();
    
    const TestComponentWithCallback = () => {
      const { toast } = useToast();
      
      return (
        <button 
          onClick={() => {
            toast.success('Test', { onClose });
          }}
        >
          Show Toast with Callback
        </button>
      );
    };
    
    customRender(<TestComponentWithCallback />
    );

    fireEvent.click(screen.getByText('Show Toast with Callback'));
    
    // Dismiss the toast
    const closeButton = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
