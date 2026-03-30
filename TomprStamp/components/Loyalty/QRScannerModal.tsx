import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Modal from '../Shared/Modal';
import { FaCamera, FaTimes } from 'react-icons/fa';

interface QRScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerId = 'qr-reader';

    useEffect(() => {
        if (isOpen) {
            // Delay slightly to ensure DOM element is ready
            const timer = setTimeout(() => {
                startScanner();
            }, 300);
            return () => {
                clearTimeout(timer);
                stopScanner();
            };
        }
    }, [isOpen]);

    const startScanner = async () => {
        try {
            const html5QrCode = new Html5Qrcode(scannerId);
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            };

            await html5QrCode.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Success!
                    stopScanner();
                    onScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // ignore errors - they happen frequently during scanning
                }
            );
        } catch (err) {
            console.error('Failed to start scanner:', err);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
            } catch (err) {
                console.error('Failed to stop scanner:', err);
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Scan QR Code"
            size="md"
        >
            <div className="flex flex-col items-center">
                <div className="w-full bg-black rounded-2xl overflow-hidden relative shadow-2xl aspect-square mb-6">
                    <div id={scannerId} className="w-full h-full"></div>

                    {/* Scanner Overlay UI */}
                    <div className="absolute inset-0 pointer-events-none border-[3px] border-emerald/50 m-12 rounded-3xl animate-pulse"></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white/30">
                        <FaCamera size={48} />
                    </div>
                </div>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400 px-6">
                    Align the stamp QR code within the frame to claim your rewards automatically.
                </p>

                <button
                    onClick={onClose}
                    className="mt-8 w-full py-4 bg-gray-100 dark:bg-charcoal-900 text-charcoal-dark dark:text-cream-light rounded-xl font-bold flex items-center justify-center"
                >
                    <span className="mr-2"><FaTimes size={16} /></span> Cancel
                </button>
            </div>
        </Modal>
    );
};

export default QRScannerModal;
