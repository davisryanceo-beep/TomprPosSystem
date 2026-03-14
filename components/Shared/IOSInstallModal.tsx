import React from 'react';
import { FaShareSquare, FaPlusSquare, FaTimes } from 'react-icons/fa';

interface IOSInstallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 pb-0">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Panel - Slides up on mobile, centered on larger screens */}
            <div className="relative w-full max-w-sm bg-white dark:bg-charcoal-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 animate-slide-up sm:animate-zoom-in">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-600 dark:text-cream-dark dark:hover:text-cream transition-colors p-2"
                    aria-label="Close"
                >
                    <FaTimes size={24} />
                </button>

                <div className="text-center space-y-6 mt-2">
                    <h2 className="text-2xl font-extrabold text-charcoal-dark dark:text-cream-light">
                        Install Stamp App
                    </h2>

                    <p className="text-charcoal-600 dark:text-cream-dark text-lg leading-relaxed">
                        Install this application on your home screen for quick and easy access when you're on the go.
                    </p>

                    <div className="bg-cream-100 dark:bg-charcoal-700 rounded-xl p-5 text-left border border-cream-200 dark:border-charcoal-600 shadow-inner">
                        <ol className="space-y-4">
                            <li className="flex items-center gap-4 text-charcoal-700 dark:text-cream">
                                <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-charcoal-600 rounded-lg shadow flex items-center justify-center text-blue-500">
                                    <span className="-mt-1"><FaShareSquare size={20} /></span>
                                </div>
                                <span className="font-medium text-lg">1. Tap the <strong className="text-charcoal-dark dark:text-white">Share</strong> icon at the bottom.</span>
                            </li>

                            <li className="flex items-start gap-4 text-charcoal-700 dark:text-cream pt-2 border-t border-cream-200 dark:border-charcoal-600/50">
                                <div className="flex-shrink-0 w-10 h-10 bg-white dark:bg-charcoal-600 rounded-lg shadow flex items-center justify-center text-charcoal-500 dark:text-cream-dark">
                                    <FaPlusSquare size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-lg mt-1">2. Select <strong className="text-charcoal-dark dark:text-white">Add to Home Screen</strong>.</span>
                                    <span className="text-sm text-charcoal-500 dark:text-charcoal-300 mt-2 italic">
                                        (Note: You must be using the Safari browser to see this option)
                                    </span>
                                </div>
                            </li>
                        </ol>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 mt-4 bg-charcoal-100 hover:bg-charcoal-200 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-charcoal-800 dark:text-cream font-bold rounded-xl transition-colors"
                    >
                        Got it!
                    </button>

                    {/* Visual pointer (triangle) pointing down on mobile to mimic pointing at the share bar */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white dark:bg-charcoal-800 rotate-45 transform sm:hidden"></div>
                </div>
            </div>
        </div>
    );
};

export default IOSInstallModal;
