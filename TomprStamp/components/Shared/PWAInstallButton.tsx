import React, { useState, useEffect } from 'react';
import { FaDownload, FaMobileAlt, FaApple } from 'react-icons/fa';
import IOSInstallModal from './IOSInstallModal';

const PWAInstallButton: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSModal, setShowIOSModal] = useState(false);

    useEffect(() => {
        // Detect iOS (including iPads/iPhones requesting Desktop Website)
        const isIOSDevice =
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 0);

        // Detect if it's specifically Safari (only Safari can add to home screen on iOS)
        const isSafari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/);

        // Check if already installed
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (standalone) {
            setIsVisible(false);
            return;
        }

        if (isIOSDevice && isSafari) {
            // Check if user previously dismissed the iOS prompt
            const hasDismissed = localStorage.getItem('iosInstallPromptDismissed');
            if (!hasDismissed) {
                setIsIOS(true);
                setIsVisible(true);
            }
        } else if (!isIOSDevice) {
            // Standard Android/Chrome logic
            const handler = (e: any) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setIsVisible(true);
            };

            window.addEventListener('beforeinstallprompt', handler);
            return () => window.removeEventListener('beforeinstallprompt', handler);
        }
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSModal(true);
            return;
        }

        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User adaptation to the install prompt: ${outcome}`);

        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleCloseIOSModal = () => {
        setShowIOSModal(false);
        setIsVisible(false);
        localStorage.setItem('iosInstallPromptDismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <>
            <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98] mt-4"
            >
                {isIOS ? <span className="mb-1"><FaApple size={24} /></span> : <FaMobileAlt size={20} />}
                <span>{isIOS ? "Install App on iPhone" : "Install App on Phone"}</span>
            </button>

            <IOSInstallModal
                isOpen={showIOSModal}
                onClose={handleCloseIOSModal}
            />
        </>
    );
};

export default PWAInstallButton;
