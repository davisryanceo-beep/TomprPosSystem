import React, { useState } from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { FaCopy, FaExternalLinkAlt, FaStore } from 'react-icons/fa';
import { useShop } from '../../contexts/ShopContext';

interface OnlineMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OnlineMenuModal: React.FC<OnlineMenuModalProps> = ({ isOpen, onClose }) => {
    const { currentStoreId } = useShop();
    const [copied, setCopied] = useState(false);

    // Construct the public menu URL
    // Assuming hash router: http://host/#/menu/:storeId
    const origin = window.location.origin;
    const menuUrl = `${origin}/#/menu/${currentStoreId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(menuUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard');
        }
    };

    const handlePreview = () => {
        window.open(menuUrl, '_blank');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Online Menu"
            size="md"
            footer={
                <div className="flex justify-end space-x-2 w-full">
                    <Button onClick={onClose} variant="secondary">
                        Close
                    </Button>
                    <Button onClick={handlePreview} leftIcon={<FaExternalLinkAlt />}>
                        Open Preview
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-emerald/10 rounded-full flex items-center justify-center text-emerald text-3xl mb-4">
                        <FaStore />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                        Share this link with your customers to allow them to browse the menu and order online.
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-charcoal-dark p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        Public Menu Link
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            readOnly
                            value={menuUrl}
                            className="flex-grow p-2 text-sm bg-white dark:bg-charcoal border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 focus:outline-none"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <Button
                            onClick={handleCopy}
                            variant={copied ? 'success' : 'secondary'}
                            size="sm"
                            leftIcon={copied ? undefined : <FaCopy />}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                </div>

                <div className="text-sm text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start">
                    <span className="mr-2 text-lg">💡</span>
                    <p>
                        New online orders will appear in the system automatically with a visual alert.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default OnlineMenuModal;
