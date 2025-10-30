# Toast Component

A highly customizable, accessible, and performant toast notification system for React applications with TypeScript support.

## Features

- 🎨 Multiple toast types: success, error, warning, info
- 🎯 Customizable positioning
- ⏱ Auto-dismiss with progress indicator
- 🎭 Dark/light mode support
- 🌍 i18n support
- ⌨️ Keyboard accessible
- 🏗 Built with TypeScript
- 🎉 Smooth animations with Framer Motion
- 📱 Responsive design
- 🎨 Customizable styles and theming

## Installation

```bash
# If using npm
npm install @your-package/toast

# If using yarn
yarn add @your-package/toast
```

## Usage

### Basic Usage

```tsx
import { ToastProvider, useToast } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <MyComponent />
    </ToastProvider>
  );
}

function MyComponent() {
  const { toast } = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Operation completed!')}>
        Show Success
      </button>
    </div>
  );
}
```

### Toast Methods

```tsx
const { toast } = useToast();

// Different toast types
toast.success('Success message');
toast.error('Error message');
toast.warning('Warning message');
toast.info('Info message');

// With options
const toastId = toast.success('Custom message', {
  title: 'Success',
  duration: 5000, // 5 seconds
  position: 'top-right',
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo action')
  },
  onClose: () => console.log('Toast closed'),
  className: 'custom-toast',
  disableAutoClose: false
});

// Update a toast
toast.update(toastId, {
  message: 'Updated message',
  type: 'error'
});

// Remove a toast
toast.dismiss(toastId);

// Remove all toasts
toast.dismissAll();
```

## API Reference

### ToastProvider

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | The app content |
| defaultPosition | 'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left' | 'bottom-right' | Default position for toasts |
| autoDismiss | boolean | true | Whether to auto-dismiss toasts |
| dismissDuration | number | 5000 | Duration in milliseconds before auto-dismiss |

### useToast()

Returns an object with the following methods:

#### toast.success(message: string, options?: ToastOptions): string
Show a success toast.

#### toast.error(message: string, options?: ToastOptions): string
Show an error toast.

#### toast.warning(message: string, options?: ToastOptions): string
Show a warning toast.

#### toast.info(message: string, options?: ToastOptions): string
Show an info toast.

#### toast.dismiss(id: string): void
Dismiss a specific toast by ID.

#### toast.dismissAll(): void
Dismiss all toasts.

#### toast.update(id: string, options: Partial<ToastOptions>): void
Update an existing toast.

### ToastOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| id | string | auto-generated | Unique identifier for the toast |
| type | 'success' \| 'error' \| 'warning' \| 'info' | 'info' | Type of toast |
| duration | number | 5000 | Time in milliseconds before auto-dismiss |
| title | string | undefined | Optional title for the toast |
| position | 'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left' | Inherited from provider | Position of the toast |
| action | { label: string; onClick: () => void } | undefined | Optional action button |
| disableAutoClose | boolean | false | Disable auto-dismiss |
| className | string | '' | Additional CSS class for the toast |
| onClose | () => void | undefined | Callback when toast is closed |

## Theming

The toast component supports theming through CSS variables. You can override these variables in your app's CSS:

```css
:root {
  --toast-bg: #ffffff;
  --toast-text: #1a1a1a;
  --toast-success-bg: #d4edda;
  --toast-success-text: #155724;
  --toast-error-bg: #f8d7da;
  --toast-error-text: #721c24;
  --toast-warning-bg: #fff3cd;
  --toast-warning-text: #856404;
  --toast-info-bg: #d1ecf1;
  --toast-info-text: #0c5460;
  --toast-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --toast-border-radius: 0.375rem;
  --toast-padding: 1rem;
  --toast-margin: 0.5rem;
  --toast-width: 22rem;
  --toast-z-index: 1000;
}

/* Dark mode */
[data-theme='dark'] {
  --toast-bg: #2d3748;
  --toast-text: #f7fafc;
  /* Update other colors for dark mode */
}
```

## Accessibility

The toast component is built with accessibility in mind:

- Proper ARIA attributes for screen readers
- Keyboard navigation support
- Focus management
- Reduced motion support
- High contrast mode support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 12+)
- Chrome for Android

## License

MIT

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) to get started.
