import React from 'react';
import Modal from './Modal';
import { FaKeyboard } from 'react-icons/fa';

interface ShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ isOpen, onClose }) => {
    const shortcuts = [
        { keys: 'F2', description: 'Focus product search' },
        { keys: 'F12', description: 'Quick cash payment' },
        { keys: 'Ctrl + P', description: 'Print last receipt' },
        { keys: 'Esc', description: 'Clear current order' },
        { keys: 'Ctrl + D', description: 'Apply discount/promotion' },
        { keys: 'Ctrl + T', description: 'Select table' },
        { keys: 'Ctrl + R', description: 'Toggle rush order' },
        { keys: '?', description: 'Show this help' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
            <div className="space-y-3">
                <p className="text-sm text-charcoal-light dark:text-cream-light/70 mb-4">
                    Use these keyboard shortcuts to speed up your workflow:
                </p>
                {shortcuts.map((shortcut, index) => (
                    <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-cream dark:bg-charcoal-dark rounded-lg"
                    >
                        <span className="text-charcoal-dark dark:text-cream-light">{shortcut.description}</span>
                        <kbd className="px-3 py-1 bg-charcoal-dark dark:bg-cream-light text-cream-light dark:text-charcoal-dark rounded font-mono text-sm font-bold">
                            {shortcut.keys}
                        </kbd>
                    </div>
                ))}
            </div>
            <div className="mt-6 p-3 bg-emerald/10 rounded-lg">
                <p className="text-sm text-emerald-dark dark:text-emerald flex items-center gap-2">
                    <FaKeyboard />
                    <span>Tip: Shortcuts work anywhere except when typing in input fields</span>
                </p>
            </div>
        </Modal>
    );
};

export default ShortcutsHelp;
