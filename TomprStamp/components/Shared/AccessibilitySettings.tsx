import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { FaTextHeight, FaAdjust, FaLanguage } from 'react-icons/fa';

interface AccessibilitySettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ isOpen, onClose }) => {
    const { fontSize, setFontSize, highContrast, toggleHighContrast, language, setLanguage, virtualKeyboardEnabled, toggleVirtualKeyboard } = useAccessibility();


    const fontSizes = [
        { value: 'small', label: 'Small', example: 'text-sm' },
        { value: 'medium', label: 'Medium', example: 'text-base' },
        { value: 'large', label: 'Large', example: 'text-lg' },
        { value: 'x-large', label: 'Extra Large', example: 'text-xl' }
    ] as const;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Accessibility Settings" size="md">
            <div className="space-y-6">
                {/* Font Size */}
                <div>
                    <label className="flex items-center gap-2 text-lg font-bold mb-3">
                        <FaTextHeight />
                        <span>Font Size</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {fontSizes.map(({ value, label, example }) => (
                            <button
                                key={value}
                                onClick={() => setFontSize(value)}
                                className={`p-3 rounded-lg border-2 transition-all ${fontSize === value
                                    ? 'border-emerald bg-emerald/10 font-bold'
                                    : 'border-charcoal-light/20 hover:border-emerald/50'
                                    }`}
                                aria-pressed={fontSize === value}
                            >
                                <div className={example}>{label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* High Contrast */}
                <div>
                    <label className="flex items-center gap-2 text-lg font-bold mb-3">
                        <FaAdjust />
                        <span>High Contrast Mode</span>
                    </label>
                    <Button
                        onClick={toggleHighContrast}
                        variant={highContrast ? 'primary' : 'secondary'}
                        className="w-full"
                        aria-pressed={highContrast}
                    >
                        {highContrast ? 'Enabled' : 'Disabled'}
                    </Button>
                    <p className="text-sm text-charcoal-light dark:text-cream-light/70 mt-2">
                        Increases contrast for better visibility
                    </p>
                </div>

                {/* Keyboard */}
                <div>
                    <label className="flex items-center gap-2 text-lg font-bold mb-3">
                        <span className="text-2xl">⌨️</span>
                        <span>On-Screen Keyboard</span>
                    </label>
                    <Button
                        onClick={toggleVirtualKeyboard}
                        variant={virtualKeyboardEnabled ? 'primary' : 'secondary'}
                        className="w-full"
                        aria-pressed={virtualKeyboardEnabled}
                    >
                        {virtualKeyboardEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                    <p className="text-sm text-charcoal-light dark:text-cream-light/70 mt-2">
                        Automatically show virtual keyboard on touch
                    </p>
                </div>

                {/* Language */}
                <div>
                    <label className="flex items-center gap-2 text-lg font-bold mb-3">
                        <FaLanguage />
                        <span>Language / ភាសា</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`p-3 rounded-lg border-2 transition-all ${language === 'en'
                                ? 'border-emerald bg-emerald/10 font-bold'
                                : 'border-charcoal-light/20 hover:border-emerald/50'
                                }`}
                            aria-pressed={language === 'en'}
                        >
                            English
                        </button>
                        <button
                            onClick={() => setLanguage('km')}
                            className={`p-3 rounded-lg border-2 transition-all ${language === 'km'
                                ? 'border-emerald bg-emerald/10 font-bold'
                                : 'border-charcoal-light/20 hover:border-emerald/50'
                                }`}
                            aria-pressed={language === 'km'}
                        >
                            ភាសាខ្មែរ
                        </button>
                    </div>
                </div>

                {/* Screen Reader Info */}
                <div className="p-4 bg-emerald/10 rounded-lg">
                    <p className="text-sm">
                        <strong>Screen Reader Support:</strong> This application includes ARIA labels and live regions for screen reader compatibility.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default AccessibilitySettings;
