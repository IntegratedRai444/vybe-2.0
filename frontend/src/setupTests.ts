import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
  };
};

// Mock ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub;

// Mock monaco editor
import React from 'react';

jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    onChange?: (value: string, event: any) => void;
    value?: string;
    defaultValue?: string;
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={props.value || props.defaultValue}
      onChange={(e) => props.onChange?.(e.target.value, e as any)}
      {...props}
    />
  )
}));

// Add TextEncoder/TextDecoder for JSDOM
Object.assign(global, { TextEncoder, TextDecoder });

// Mock window.scrollTo
window.scrollTo = jest.fn();
