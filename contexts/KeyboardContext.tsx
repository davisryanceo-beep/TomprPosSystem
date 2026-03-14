
import React, { createContext, useState, useContext, ReactNode, useRef, useCallback, useEffect } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { useTheme } from './ThemeContext';
import { useAccessibility } from './AccessibilityContext';

interface KeyboardContextType {
  showKeyboard: (inputElement: HTMLInputElement | HTMLTextAreaElement) => void;
  hideKeyboard: () => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

const keyboardLayouts = {
  default: [
    "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
    "{tab} q w e r t y u i o p [ ] \\",
    "{lock} a s d f g h j k l ; ' {enter}",
    "{shift} z x c v b n m , . / {shift}",
    "{space}"
  ],
  shift: [
    "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
    "{tab} Q W E R T Y U I O P { } |",
    '{lock} A S D F G H J K L : " {enter}',
    "{shift} Z X C V B N M < > ? {shift}",
    "{space}"
  ],
  numeric: [
    '1 2 3',
    '4 5 6',
    '7 8 9',
    '. 0 {bksp}',
    '{enter}'
  ]
};


export const KeyboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [inputElement, setInputElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [layoutName, setLayoutName] = useState('default');
  const keyboardRef = useRef<any>(null);
  const { theme } = useTheme();
  const { virtualKeyboardEnabled } = useAccessibility();

  const showKeyboard = useCallback((element: HTMLInputElement | HTMLTextAreaElement) => {
    setInputElement(element);

    // Determine layout based on input type or id
    if (element.type === 'number' || element.id === 'cashTendered' || element.inputMode === 'numeric') {
      setLayoutName('numeric');
    } else {
      setLayoutName('default');
    }

    setIsVisible(true);

    if (keyboardRef.current) {
      keyboardRef.current.setInput(element.value);
    }
  }, []);

  // Auto-show keyboard on focus if enabled
  useEffect(() => {
    if (!virtualKeyboardEnabled) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Ignore file inputs, checkboxes, radios, etc.
        const input = target as HTMLInputElement;
        const type = input.type;
        if (type === 'text' || type === 'number' || type === 'password' || type === 'search' || type === 'email' || type === 'tel' || target.tagName === 'TEXTAREA') {
          showKeyboard(target as HTMLInputElement | HTMLTextAreaElement);
        }
      }
    };

    // Use capture phase to ensure we catch it
    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, [virtualKeyboardEnabled, showKeyboard]);

  const hideKeyboard = useCallback(() => {
    setIsVisible(false);
    setInputElement(null);
  }, []);

  const handleKeyPress = (button: string) => {
    if (!inputElement) return;

    if (button === "{shift}" || button === "{lock}") {
      // Prevent shift on numeric layout
      if (layoutName !== 'numeric') {
        setLayoutName(layoutName === "default" ? "shift" : "default");
      }
    } else if (button === "{enter}") {
      hideKeyboard();
    }
  };

  const handleInputChange = (value: string) => {
    if (inputElement) {
      // Create a new event to simulate native input change for React's state updates
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

      if (inputElement instanceof HTMLInputElement && nativeInputValueSetter) {
        nativeInputValueSetter.call(inputElement, value);
      } else if (inputElement instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(inputElement, value);
      }

      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  return (
    <KeyboardContext.Provider value={{ showKeyboard, hideKeyboard }}>
      {children}
      {isVisible && (
        <div
          className="fixed inset-0 z-50 bg-charcoal-900/30"
          onClick={hideKeyboard}
        >
          <div
            className="fixed bottom-0 left-0 right-0 z-[60] transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside keyboard from closing it
          >
            <Keyboard
              keyboardRef={(r) => (keyboardRef.current = r)}
              layoutName={layoutName}
              layout={keyboardLayouts}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              theme={`hg-theme-default myTheme ${theme}`}
              display={{
                '{bksp}': '⌫',
                '{enter}': 'Done',
                '{shift}': 'shift',
                '{space}': 'space',
                '{tab}': 'tab',
                '{lock}': 'caps lock',
              }}
              mergeDisplay={true}
            />
          </div>
        </div>
      )}
    </KeyboardContext.Provider>
  );
};

export const useKeyboard = (): KeyboardContextType => {
  const context = useContext(KeyboardContext);
  if (context === undefined) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};
