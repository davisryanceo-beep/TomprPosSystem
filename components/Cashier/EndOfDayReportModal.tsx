import React, { useMemo } from 'react';
import Modal from '../Shared/Modal';
import Button from '../Shared/Button';
import { useShop } from '../../contexts/ShopContext';
import { Order, OrderStatus, PaymentMethod } from '../../types';
import { FaPrint, FaTimes, FaCalculator } from 'react-icons/fa';

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
            // Assuming finalAmount already has discounts applied
            // Let's re-calculate gross if possible, but totalAmount is usually pre-tax and pre-discount.
            // We will use totalAmount as gross and finalAmount as net.
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
                        Close
                    </Button>
                    <Button onClick={() => window.print()} variant="primary" leftIcon={<FaPrint />}>
                        Print Report
                    </Button>
                </div>
            }
        >
            <div className="printable-report p-4 space-y-6 text-charcoal dark:text-cream-light">
                <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold">Shift Summary Report</h2>
                    <p className="text-gray-500 mt-1">Cashier: {cashierName}</p>
                    <p className="text-sm text-gray-500">
                        Shift Started: {shiftStartTime.toLocaleDateString()} {shiftStartTime.toLocaleTimeString()}
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Total Transactions:</span>
                        <span className="font-bold text-lg">{reportData.totalOrders}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Gross Sales:</span>
                        <span className="font-bold text-lg">${reportData.totalGrossSales.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 text-red-500">
                        <span className="font-medium">Discounts Given:</span>
                        <span className="font-bold text-lg">-${reportData.totalDiscountAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Net Sales:</span>
                        <span className="font-bold text-xl text-emerald">${reportData.totalNetSales.toFixed(2)}</span>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-charcoal/50 p-4 rounded-lg mt-6">
                    <h3 className="font-bold mb-3 flex items-center gap-2"><FaCalculator /> Payment Breakdown</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-300">Cash:</span>
                            <span className="font-semibold">${reportData.totalCashSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-300">QR / Card:</span>
                            <span className="font-semibold">${reportData.totalQRSales.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mt-4 border border-amber-200 dark:border-amber-800/50">
                    <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
                        Expected Cash in Drawer: ${reportData.totalNetSales.toFixed(2)}
                    </p>
                </div>

                {shiftCashDeclaration && (
                    <div className={`p-4 rounded-lg mt-4 border ${shiftCashDeclaration.discrepancy === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 dark:text-gray-300">Declared Cash:</span>
                            <span className="font-semibold">${shiftCashDeclaration.declaredAmount.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between items-center font-bold ${shiftCashDeclaration.discrepancy === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                            <span>Discrepancy:</span>
                            <span>{shiftCashDeclaration.discrepancy > 0 ? '+' : ''}{shiftCashDeclaration.discrepancy.toFixed(2)}</span>
                        </div>
                        {shiftCashDeclaration.cashierNotes && (
                            <p className="text-xs mt-2 italic text-gray-500">Note: {shiftCashDeclaration.cashierNotes}</p>
                        )}
                    </div>
                )}

            </div>

            <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-report, .printable-report * {
            visibility: visible;
          }
          .printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
        </Modal>
    );
};

export default EndOfDayReportModal;
