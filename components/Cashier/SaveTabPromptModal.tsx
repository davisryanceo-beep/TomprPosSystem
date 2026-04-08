import React, { useState } from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { FaSave, FaTag, FaChair } from 'react-icons/fa';

interface SaveTabPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (label: string) => void;
    currentTable?: string;
}

const SaveTabPromptModal: React.FC<SaveTabPromptModalProps> = ({ isOpen, onClose, onConfirm, currentTable }) => {
    const [label, setLabel] = useState(currentTable || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(label.trim());
        setLabel('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save Tab Identification" size="sm">
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-emerald/10 text-emerald rounded-full flex items-center justify-center mx-auto">
                        <FaTag size={28} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Give this tab a name or table number to find it easily later.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FaChair />
                    </div>
                    <input
                        autoFocus
                        type="text"
                        placeholder="e.g. Table 5, Garden Seat, John's Pick..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-charcoal border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald focus:border-transparent outline-none transition-all font-bold"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                        Skip
                    </Button>
                    <Button type="submit" variant="primary" className="flex-1" leftIcon={<FaSave />}>
                        Save Tab
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default SaveTabPromptModal;
