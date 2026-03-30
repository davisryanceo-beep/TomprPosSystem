
import React from 'react';
import { FaWifi, FaBatteryFull, FaSignal } from 'react-icons/fa';

interface MobileLayoutProps {
    children: React.ReactNode;
    title?: string;
    showStatusBar?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, title, showStatusBar = true }) => {
    return (
        <div className="min-h-screen bg-gray-50 flex justify-center">
            <div className="w-full max-w-md bg-white shadow-xl min-h-screen flex flex-col relative">
                {/* Fake Status Bar for PWA feel */}
                {showStatusBar && (
                    <div className="bg-gray-900 text-white px-4 py-1 flex justify-between items-center text-xs">
                        <span>9:41</span>
                        <div className="flex gap-2">
                            <FaSignal />
                            <FaWifi />
                            <FaBatteryFull />
                        </div>
                    </div>
                )}

                {/* Header */}
                {title && (
                    <div className="bg-emerald-600 text-white p-4 text-center font-bold text-lg shadow-sm z-10 sticky top-0">
                        {title}
                    </div>
                )}

                <main className="flex-grow overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MobileLayout;
