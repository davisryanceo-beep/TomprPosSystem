import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Order, Product, SupplyItem, OrderItem, TimeLog, WastageLog, CashDrawerLog, User } from '../types';

const SHOP_NAME = "Amble Specialty Cafe";

const addHeaderFooter = (doc: jsPDF, title: string, reportDate: Date, filterInfo?: string) => {
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  doc.setTextColor(150);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Header
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text(SHOP_NAME, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    let dateLine = `Report Date: ${reportDate.toLocaleDateString()}`;
    if (filterInfo) {
      dateLine += ` | Filters: ${filterInfo}`;
    }
    doc.text(dateLine, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

    // Footer
    doc.text(
      `Page ${i} of ${pageCount} | Generated on: ${new Date().toLocaleString()}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
};

const formatCurrency = (val: number) => {
  return val.toLocaleString() + '៛';
};

const formatCustomizationsForPDF = (customizations?: OrderItem['customizations']) => {
  if (!customizations) return '-';
  const parts = [];
  if (customizations.size && customizations.size !== 'Medium') parts.push(customizations.size);
  if (customizations.milk && customizations.milk !== 'None') parts.push(customizations.milk);
  if (customizations.sugar && customizations.sugar !== 'None') parts.push(customizations.sugar);
  if (customizations.ice && customizations.ice !== 'None') parts.push(customizations.ice);
  return parts.length > 0 ? parts.join(', ') : '-';
};

export const generateSalesReportPDF = (
  ordersToReport: Order[],
  reportDate: Date,
  totalSales: number,
  cashSales: number,
  qrSales: number,
  filterCriteria: { startDate?: string, endDate?: string, category?: string }
) => {
  const doc = new jsPDF();
  const isFiltered = filterCriteria.startDate || filterCriteria.endDate || filterCriteria.category;
  const title = isFiltered ? "Filtered Sales Report" : "Daily Sales Report";
  let filterInfoString = "";
  if (isFiltered) {
    const parts = [];
    if (filterCriteria.startDate) parts.push(`From: ${filterCriteria.startDate}`);
    if (filterCriteria.endDate) parts.push(`To: ${filterCriteria.endDate}`);
    if (filterCriteria.category) parts.push(`Category: ${filterCriteria.category}`);
    filterInfoString = parts.join('; ');
  }

  let startY = 35;

  doc.setFontSize(12);
  doc.text("Sales Summary:", 14, startY);
  startY += 7;
  doc.setFontSize(10);
  doc.text(`Total Orders: ${ordersToReport.length}`, 14, startY);
  startY += 5;
  doc.text(`Total Sales (KHR): ${formatCurrency(totalSales)}`, 14, startY);
  startY += 5;
  doc.text(`- Cash Sales: ${formatCurrency(cashSales)}`, 18, startY);
  startY += 5;
  doc.text(`- QR Sales: ${formatCurrency(qrSales)}`, 18, startY);
  startY += 10;

  const head = [['Order ID', 'Time', 'Items', 'Payment', 'Total (KHR)']];
  const body = ordersToReport.map(order => {
    const itemsSummary = order.items.map(item => `${item.quantity}x ${item.productName} ${formatCustomizationsForPDF(item.customizations)}`).join('; ');
    const paymentInfo = `${order.paymentMethod || 'N/A'}${order.paymentMethod === 'Cash' && order.paymentCurrency ? ` (${order.paymentCurrency})` : ''}`;
    return [
      order.dailyOrderNumber ? `#${order.dailyOrderNumber}` : order.id.slice(-6),
      new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      itemsSummary,
      paymentInfo,
      formatCurrency(order.finalAmount)
    ];
  });

  (doc as any).autoTable({
    head,
    body,
    startY,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 },
    columnStyles: {
      2: { cellWidth: 60 },
      4: { halign: 'right' }
    }
  });

  addHeaderFooter(doc, title, reportDate, filterInfoString);
  const dateSuffix = isFiltered ? reportDate.toISOString().split('T')[0] + '_filtered' : reportDate.toISOString().split('T')[0];
  doc.save(`sales_report_${dateSuffix}.pdf`);
};

export const generateProductInventoryReportPDF = (products: Product[]) => {
  const doc = new jsPDF();
  const title = "Product Inventory Report";
  const reportDate = new Date();

  const head = [['ID', 'Name', 'Category', 'Price (KHR)', 'Stock', 'Description']];
  const body = products.map(p => [
    p.id.slice(-6),
    p.name,
    p.category,
    formatCurrency(p.price),
    p.stock.toString(),
    p.description || '-'
  ]);

  (doc as any).autoTable({
    head,
    body,
    startY: 35,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 },
    columnStyles: {
      3: { halign: 'right' },
      5: { cellWidth: 60 }
    }
  });

  addHeaderFooter(doc, title, reportDate);
  doc.save(`product_inventory_report_${reportDate.toISOString().split('T')[0]}.pdf`);
};

export const generateSupplyStockReportPDF = (supplyItems: SupplyItem[]) => {
  const doc = new jsPDF();
  const title = "Supply Stock Report";
  const reportDate = new Date();

  const head = [['ID', 'Name', 'Category', 'Current Stock', 'Unit', 'Low Threshold', 'Purchase', 'Expiry', 'Notes']];
  const body = supplyItems.map(s => [
    s.id.slice(-6),
    s.name,
    s.category,
    s.currentStock.toString(),
    s.unit,
    s.lowStockThreshold.toString(),
    s.purchaseDate || '-',
    s.expiryDate || '-',
    s.notes || '-'
  ]);

  (doc as any).autoTable({
    head,
    body,
    startY: 35,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 },
    columnStyles: {
      8: { cellWidth: 40 }
    }
  });

  addHeaderFooter(doc, title, reportDate);
  doc.save(`supply_stock_report_${reportDate.toISOString().split('T')[0]}.pdf`);
};

const calculateDurationForPDF = (clockInTime?: string, clockOutTime?: string): string => {
  if (!clockInTime || !clockOutTime) return '-';
  const inTime = new Date(clockInTime);
  const outTime = new Date(clockOutTime);
  const diffMs = outTime.getTime() - inTime.getTime();
  if (diffMs < 0) return 'Invalid';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

export const generateAttendanceReportPDF = (
  timeLogs: TimeLog[],
  filterCriteria: { userId?: string, startDate?: string, endDate?: string },
  totalHoursSummary: { userName: string, totalHours: string, logCount: number }[]
) => {
  const doc = new jsPDF('landscape');
  const title = "Staff Attendance Report";
  const reportDate = new Date();
  let filterInfoString = "Filters: ";
  const filterParts = [];
  if (filterCriteria.userId) {
    const user = totalHoursSummary.find(u => u.userName.includes(filterCriteria.userId!));
    filterParts.push(`Staff: ${user ? user.userName.split(' (')[0] : filterCriteria.userId}`);
  } else {
    filterParts.push("Staff: All");
  }
  if (filterCriteria.startDate) filterParts.push(`From: ${filterCriteria.startDate}`);
  if (filterCriteria.endDate) filterParts.push(`To: ${filterCriteria.endDate}`);
  filterInfoString += filterParts.join('; ') || 'None';

  let startY = 35;

  if (totalHoursSummary.length > 0) {
    doc.setFontSize(12);
    doc.text("Total Hours Summary:", 14, startY);
    startY += 7;
    doc.setFontSize(10);
    totalHoursSummary.forEach(summary => {
      doc.text(`${summary.userName}: ${summary.totalHours} hours (${summary.logCount} logs)`, 18, startY);
      startY += 5;
      if (startY > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        startY = 20;
      }
    });
    startY += 5;
  }

  const head = [['Staff', 'Role', 'Clock In', 'Clock Out', 'Duration', 'Notes']];
  const body = timeLogs.map(log => [
    log.userName,
    log.role,
    new Date(log.clockInTime).toLocaleString(),
    log.clockOutTime ? new Date(log.clockOutTime).toLocaleString() : 'Active',
    calculateDurationForPDF(log.clockInTime, log.clockOutTime),
    log.notes || '-'
  ]);

  (doc as any).autoTable({
    head,
    body,
    startY,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 20 },
      5: { cellWidth: 'auto' },
    }
  });

  addHeaderFooter(doc, title, reportDate, filterInfoString);
  doc.save(`attendance_report_${reportDate.toISOString().split('T')[0]}.pdf`);
};

export const generateWastageReportPDF = (
  wastageLogs: WastageLog[],
  filterCriteria: { dateFrom?: string, dateTo?: string, itemType?: 'product' | 'supply' | '' }
) => {
  const doc = new jsPDF();
  const title = "Wastage Report";
  const reportDate = new Date();
  let filterInfoString = "Filters: ";
  const filterParts = [];
  if (filterCriteria.dateFrom) filterParts.push(`From: ${filterCriteria.dateFrom}`);
  if (filterCriteria.dateTo) filterParts.push(`To: ${filterCriteria.dateTo}`);
  if (filterCriteria.itemType) filterParts.push(`Type: ${filterCriteria.itemType}`);
  filterInfoString += filterParts.join('; ') || 'None';

  const head = [['Date', 'Item Name', 'Type', 'Qty Wasted', 'Reason', 'Logged By']];
  const body = wastageLogs.map(log => [
    log.dateLogged,
    log.itemName,
    log.itemType,
    log.quantityWasted.toString(),
    log.reason || '-',
    log.loggedByUserId ? log.loggedByUserId.slice(-6) : 'System/N/A'
  ]);

  (doc as any).autoTable({
    head,
    body,
    startY: 35,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 }
  });

  addHeaderFooter(doc, title, reportDate, filterInfoString);
  doc.save(`wastage_report_${reportDate.toISOString().split('T')[0]}.pdf`);
};

export const generateEODReportPDF = (
  cashDrawerLogs: CashDrawerLog[],
  filterCriteria: { cashierId?: string, date?: string },
  allUsers: User[]
) => {
  const doc = new jsPDF('landscape');
  const title = "End-of-Day Cash Reconciliation Report";
  const reportDate = new Date();
  let filterInfoString = "Filters: ";
  const filterParts = [];
  if (filterCriteria.cashierId) {
    const cashier = allUsers.find(u => u.id === filterCriteria.cashierId);
    filterParts.push(`Cashier: ${cashier ? cashier.username : filterCriteria.cashierId}`);
  } else {
    filterParts.push("Cashier: All");
  }
  if (filterCriteria.date) filterParts.push(`Date: ${filterCriteria.date}`);
  filterInfoString += filterParts.join('; ') || 'None';

  const head = [['Type', 'Date', 'Cashier', 'Expected', 'Declared', 'Variance', 'Notes']];
  const body = cashDrawerLogs.map(log => [
    log.type || 'CLOSE',
    log.shiftDate,
    log.cashierName,
    formatCurrency(log.expectedAmount || 0),
    formatCurrency(log.declaredAmount),
    `${log.discrepancy > 0 ? '+' : ''}${formatCurrency(log.discrepancy || 0)}`,
    (log.cashierNotes || log.adminNotes) ? `${log.cashierNotes || ''}${log.adminNotes ? ` (Admin: ${log.adminNotes})` : ''}` : '-'
  ]);

  (doc as any).autoTable({
    head,
    body,
    startY: 35,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 }, // Type
      1: { cellWidth: 25 }, // Date
      2: { cellWidth: 35 }, // Cashier
      3: { cellWidth: 30, halign: 'right' }, // Expected
      4: { cellWidth: 30, halign: 'right' }, // Declared
      5: { cellWidth: 30, halign: 'right' }, // Variance
      6: { cellWidth: 'auto' }, // Notes
    }
  });

  addHeaderFooter(doc, title, reportDate, filterInfoString);
  doc.save(`eod_report_${reportDate.toISOString().split('T')[0]}.pdf`);
};