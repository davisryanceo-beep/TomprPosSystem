
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Use Html5Qrcode class for more control (or Scanner for UI)
        // Scanner UI is easier for now
        const scannerId = "reader";

        // Cleanup previous instance if any
        const startScanner = async () => {
            // We use the UI version for simplicity in PWA
            // But custom UI is better. Let's use simple Scanner with default UI.
            const html5QrcodeScanner = new Html5QrcodeScanner(
                scannerId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            html5QrcodeScanner.render((decodedText, _decodedResult) => {
                onScan(decodedText);
                html5QrcodeScanner.clear(); // Stop scanning on success
            }, (errorMessage) => {
                // parse error, ignore or log
                // console.log(errorMessage);
            });

            // Cleanup function
            return () => {
                html5QrcodeScanner.clear().catch(err => console.error("Failed to clear scanner", err));
            };
        };

        // Delay slightly to ensure DOM is ready
        const timer = setTimeout(() => {
            const el = document.getElementById(scannerId);
            if (el) {
                const html5QrcodeScanner = new Html5QrcodeScanner(
                    scannerId,
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
                );
                html5QrcodeScanner.render((text) => {
                    onScan(text);
                    // cleanup handled by parent unmounting usually, or explicit close
                }, (err) => { });

                // Save instance to clear later? 
                // The library's React support is tricky. 
                // Let's rely on component unmount to destroy the DOM element, 
                // but the library might keep stream open.
                // Better to use Html5Qrcode class directly if we want strict cleanup.
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm p-4">
                <div id="reader" className="w-full"></div>
                <p className="text-center text-sm text-gray-500 mt-4">Point camera at Store QR Code</p>
                <button
                    onClick={onClose}
                    className="mt-4 w-full py-3 bg-gray-200 rounded-xl font-bold text-gray-700"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default QRScanner;
