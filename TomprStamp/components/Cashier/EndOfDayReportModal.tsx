import React, { useMemo } from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { useShop } from '../../contexts/ShopContext';
import { Order } from '../../types';
import { FaPrint, FaTimes, FaCalculator, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

interface EndOfDayReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    cashierId: string;
    cashierName: string;
    shiftStartTime: Date;
}

const EndOfDayReportModal: React.FC<EndOfDayReportModalProps> = ({
    isOpen,
    onClose,
    cashierId,
    cashierName,
    shiftStartTime
}) => {
    const { getShiftOrders, cashDrawerLogs } = useShop();

    const shiftOrders = useMemo(() => {
        return getShiftOrders(cashierId, shiftStartTime);
    }, [getShiftOrders, cashierId, shiftStartTime]);

    const reportData = useMemo(() => {
        let totalGrossSales = 0;
        let totalDiscountAmount = 0;
        let totalCashSales = 0;
        let totalQRSales = 0;

        shiftOrders.forEach((order: Order) => {
            totalGrossSales += order.totalAmount || 0;
            totalDiscountAmount += order.discountAmount || 0;

            if (order.paymentMethod === 'Cash') {
                totalCashSales += order.finalAmount;
            } else if (order.paymentMethod === 'QR') {
                totalQRSales += order.finalAmount;
            }
        });

        const totalNetSales = totalCashSales + totalQRSales;

        return {
            totalOrders: shiftOrders.length,
            totalGrossSales,
            totalDiscountAmount,
            totalNetSales,
            totalCashSales,
            totalQRSales
        };
    }, [shiftOrders]);

    const formatKHR = (val: number) => {
        return val.toLocaleString() + '៛';
    };

    const shiftCashDeclaration = useMemo(() => {
        return cashDrawerLogs
            .filter(log => log.cashierId === cashierId && new Date(log.logTimestamp) > shiftStartTime)
            .sort((a, b) => new Date(b.logTimestamp).getTime() - new Date(a.logTimestamp).getTime())[0];
    }, [cashDrawerLogs, cashierId, shiftStartTime]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="End of Day Report"
            size="md"
            footer={
                <div className="flex justify-end gap-2 w-full">
                    <Button onClick={onClose} variant="secondary" leftIcon={<FaTimes />}>
                        Dismiss
                    </Button>
                    <Button onClick={() => window.print()} variant="primary" leftIcon={<FaPrint />}>
                        Print Report
                    </Button>
                </div>
            }
        >
            <div className="printable-report p-6 space-y-8 text-charcoal-dark dark:text-cream-light font-sans">
                {/* Header */}
                <div className="text-center pb-6 border-b-2 border-charcoal/5">
                    <h2 className="text-3xl font-black tracking-tight">SHIFT SUMMARY</h2>
                    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-bold text-charcoal-light uppercase tracking-widest">
                        <span>Cashier: {cashierName}</span>
                        <span className="opacity-30">|</span>
                        <span>Started: {shiftStartTime.toLocaleDateString()} {shiftStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-cream/30 dark:bg-charcoal/30 rounded-2xl border border-charcoal/5">
                        <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest mb-1">Total Orders</p>
                        <p className="text-2xl font-black">{reportData.totalOrders}</p>
                    </div>
                    <div className="p-4 bg-cream/30 dark:bg-charcoal/30 rounded-2xl border border-charcoal/5">
                        <p className="text-[10px] font-black text-charcoal-light uppercase tracking-widest mb-1">Net Sales</p>
                        <p className="text-2xl font-black text-emerald">{formatKHR(reportData.totalNetSales)}</p>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-charcoal-light uppercase tracking-widest flex items-center gap-2">
                        <FaCalculator className="text-emerald" /> Sales Breakdown
                    </h3>
                    
                    <div className="bg-white dark:bg-charcoal-dark/50 border border-charcoal/5 rounded-2xl divide-y divide-charcoal/5">
                        <div className="flex justify-between p-4 items-center">
                            <span className="text-xs font-bold text-charcoal-light">Gross Sales</span>
                            <span className="text-sm font-black">{formatKHR(reportData.totalGrossSales)}</span>
                        </div>
                        <div className="flex justify-between p-4 items-center">
                            <span className="text-xs font-bold text-terracotta">Discounts Applied</span>
                            <span className="text-sm font-black text-terracotta">-{formatKHR(reportData.totalDiscountAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-charcoal-light uppercase tracking-widest">Payment Methods</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-emerald/5 dark:bg-emerald-900/10 border border-emerald/10 rounded-2xl">
                            <p className="text-[9px] font-black text-emerald/60 uppercase tracking-widest">Cash Received</p>
                            <p className="text-lg font-black text-emerald">{formatKHR(reportData.totalCashSales)}</p>
                        </div>
                        <div className="p-4 bg-indigo-500/5 dark:bg-indigo-900/10 border border-indigo-500/10 rounded-2xl">
                            <p className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest">QR / Card</p>
                            <p className="text-lg font-black text-indigo-500">{formatKHR(reportData.totalQRSales)}</p>
                        </div>
                    </div>
                </div>

                {/* Drawer Summary */}
                <div className="bg-amber-500/5 dark:bg-amber-900/10 p-5 rounded-2xl border-2 border-amber-500/10">
                    <p className="text-center text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                        Expected Total Cash in Drawer
                    </p>
                    <p className="text-center text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {formatKHR(reportData.totalCashSales)}
                    </p>
                </div>

                {/* Discrepancy Reconciliation */}
                {shiftCashDeclaration && (
                    <div className={`p-5 rounded-2xl border-2 ${
                        Math.abs(shiftCashDeclaration.discrepancy || 0) <= 1 
                        ? 'bg-emerald/5 border-emerald/20 shadow-lg shadow-emerald/5' 
                        : 'bg-terracotta/5 border-terracotta/20 shadow-lg shadow-terracotta/5'
                    }`}>
                        <div className="flex flex-col items-center text-center">
                            {Math.abs(shiftCashDeclaration.discrepancy || 0) <= 1 ? (
                                <FaCheckCircle className="text-emerald text-3xl mb-2" />
                            ) : (
                                <FaExclamationCircle className="text-terracotta text-3xl mb-2" />
                            )}
                            
                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">
                                Drawer Reconciliation
                            </h4>
                            
                            <div className="flex gap-4 mt-2">
                                <div className="text-center">
                                    <p className="text-[9px] font-bold text-charcoal-light">DECLARED</p>
                                    <p className="text-sm font-black">{formatKHR(shiftCashDeclaration.declaredAmount)}</p>
                                </div>
                                <div className="text-center border-l border-charcoal/10 pl-4">
                                    <p className="text-[9px] font-bold text-charcoal-light uppercase">Variance</p>
                                    <p className={`text-sm font-black ${
                                        shiftCashDeclaration.discrepancy >= 0 ? 'text-emerald' : 'text-terracotta'
                                    }`}>
                                        {shiftCashDeclaration.discrepancy > 0 ? '+' : ''}
                                        {formatKHR(shiftCashDeclaration.discrepancy)}
                                    </p>
                                </div>
                            </div>

                            {shiftCashDeclaration.cashierNotes && (
                                <div className="mt-4 pt-4 border-t border-charcoal/5 w-full">
                                    <p className="text-[9px] font-black text-charcoal-light uppercase tracking-widest mb-1">Cashier Notes</p>
                                    <p className="text-xs italic leading-relaxed">"{shiftCashDeclaration.cashierNotes}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @media print {
                  body * { visibility: hidden; }
                  .printable-report, .printable-report * { visibility: visible; }
                  .printable-report {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0;
                    background: white !important;
                    color: black !important;
                  }
                }
            `}</style>
        </Modal>
    );
};

export default EndOfDayReportModal;
