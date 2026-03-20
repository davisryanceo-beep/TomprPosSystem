/**
 * POS Receipt Printing Utility
 * Handles standard thermal printer (ESC/POS) formatting or browser-print layouts.
 */

export interface ReceiptData {
    orderId: string;
    items: any[];
    total: number;
    subtotal: number;
    tax?: number;
    discount?: number;
    customerName?: string;
    storeName: string;
    stampsEarned?: number;
    receiptDate: Date;
}

export const printReceipt = (data: ReceiptData) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    const itemsHtml = data.items.map(item => `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span>${item.quantity}x ${item.productName}</span>
            <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
        </div>
        ${item.modifiers?.length ? `<div style="font-size: 10px; color: #666; margin-left: 10px;">${item.modifiers.map((m: any) => `+ ${m.name}`).join(', ')}</div>` : ''}
    `).join('');

    printWindow.document.write(`
        <html>
            <head>
                <style>
                    @page { size: 80mm 200mm; margin: 0; }
                    body { font-family: 'Courier New', Courier, monospace; width: 72mm; margin: 0 auto; padding: 10px; color: #000; }
                    .center { text-align: center; }
                    .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
                    .header { font-weight: bold; font-size: 16px; margin-bottom: 4px; }
                    .footer { font-size: 10px; margin-top: 15px; color: #444; }
                    .total { font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; }
                </style>
            </head>
            <body>
                <div class="center">
                    <div class="header">${data.storeName}</div>
                    <div style="font-size: 10px;">${data.receiptDate.toLocaleString()}</div>
                    <div>Order #${data.orderId.slice(-6)}</div>
                </div>
                
                <div class="divider"></div>
                
                ${itemsHtml}
                
                <div class="divider"></div>
                
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>Subtotal:</span>
                    <span>$${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.discount ? `
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span>Discount:</span>
                    <span>-$${data.discount.toFixed(2)}</span>
                </div>` : ''}
                
                <div class="total" style="margin-top: 6px;">
                    <span>TOTAL:</span>
                    <span>$${data.total.toFixed(2)}</span>
                </div>

                ${data.stampsEarned ? `
                <div class="divider"></div>
                <div class="center" style="font-weight: bold; border: 1px solid #000; padding: 4px;">
                    STAMPS EARNED: ${data.stampsEarned}
                </div>` : ''}

                <div class="footer center">
                    THANK YOU FOR VISITING!<br>
                    Keep this receipt for your stamps.<br>
                    www.tompr-stamp.com
                </div>
                
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
        </html>
    `);

    printWindow.document.close();
};
