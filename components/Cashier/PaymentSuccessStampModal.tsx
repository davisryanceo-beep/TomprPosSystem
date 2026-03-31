import React, { useEffect, useState } from 'react';
import { Order } from '../../types';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { QRCodeSVG } from 'qrcode.react';
import { FaCheckCircle, FaReceipt, FaQrcode } from 'react-icons/fa';
import { getStampClaimStatus } from '../../services/api';

interface PaymentSuccessStampModalProps {
    isOpen: boolean;
    onClose: () => void;
    onViewReceipt: () => void;
    order: Order | null;
}

const PaymentSuccessStampModal: React.FC<PaymentSuccessStampModalProps> = ({
    isOpen,
    onClose,
    onViewReceipt,
    order
}) => {
    const [claimed, setClaimed] = useState(false);

    // Reset claimed state when modal re-opens
    useEffect(() => {
        if (isOpen) setClaimed(false);
    }, [isOpen]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isOpen && order?.pendingStampClaimId && !claimed) {
            interval = setInterval(async () => {
                try {
                    const res = await getStampClaimStatus(order.pendingStampClaimId!);
                    if (res.data.success && res.data.claimed) {
                        setClaimed(true);
                        clearInterval(interval);
                        // Briefly show a success state before auto-closing
                        setTimeout(() => {
                            onClose();
                        }, 2000);
                    }
                } catch (e) {
                    console.error("Failed to check stamp claim status", e);
                }
            }, 2500); // Poll every 2.5 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOpen, order?.pendingStampClaimId, claimed, onClose]);

    if (!order) return null;

    const claimUrl = order.pendingStampClaimId
        ? `https://stamp.flowspos.com/#/claim/${order.pendingStampClaimId}?storeId=${order.storeId}`
        : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Payment Successful!"
            size="md"
            footer={
                <div className="flex gap-4 w-full">
                    <Button onClick={onViewReceipt} variant="outline" className="flex-1" leftIcon={<FaReceipt />}>
                        View Receipt
                    </Button>
                    <Button onClick={onClose} className="flex-1">
                        Done
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-emerald/10 text-emerald rounded-full flex items-center justify-center mb-6">
                    <FaCheckCircle size={48} />
                </div>

                <h2 className="text-3xl font-black text-charcoal-dark dark:text-cream-light mb-2">Order Paid</h2>
                <p className="text-charcoal-light mb-8">
                    Total: <span className="font-bold text-charcoal-dark dark:text-cream-light">${order.finalAmount?.toFixed(2)}</span>
                </p>

                {claimUrl && (
                    <div className="bg-cream dark:bg-charcoal-dark p-8 rounded-[2rem] border-2 border-dashed border-emerald/30 w-full relative overflow-hidden transition-all duration-500">
                        <div className="absolute -right-4 -top-4 text-emerald/5 rotate-12">
                            <FaQrcode size={120} />
                        </div>

                        {!claimed ? (
                            <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-300">
                                <h3 className="text-xl font-bold text-emerald mb-2">Earn {order.pendingStampCount} Stamps!</h3>
                                <p className="text-sm text-charcoal-light mb-6">Ask the customer to scan this code to claim their stamps.</p>

                                <div className="bg-white p-4 rounded-2xl shadow-lg border border-charcoal/5 mb-4">
                                    <QRCodeSVG
                                        value={claimUrl}
                                        size={200}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>

                                <p className="text-xs text-charcoal-light uppercase tracking-widest font-bold">Waiting for scan...</p>
                            </div>
                        ) : (
                            <div className="relative z-10 flex flex-col items-center py-12 animate-in zoom-in duration-300">
                                <div className="w-20 h-20 bg-emerald text-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                                    <FaCheckCircle size={40} />
                                </div>
                                <h3 className="text-2xl font-bold text-emerald mb-2">Stamps Claimed!</h3>
                                <p className="text-charcoal-light">The customer successfully received {order.pendingStampCount} stamps.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PaymentSuccessStampModal;
