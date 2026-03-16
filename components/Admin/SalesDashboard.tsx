import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useShop } from '../../contexts/ShopContext';
import { Order, OrderStatus } from '../../types';
import Button from '../Shared/Button';
import Input from '../Shared/Input';
import Select from '../Shared/Select';
import { generateSalesReportPDF } from '../../services/pdfService';
import LoadingSpinner from '../Shared/LoadingSpinner';
import { FaDollarSign, FaBrain, FaFilePdf, FaFilter, FaTimesCircle, FaChartPie, FaSortAmountDown, FaSortAmountUp, FaSync, FaBoxOpen } from 'react-icons/fa';
import { useTheme } from '../../contexts/ThemeContext';
import { COFFEE_COLORS } from '../../constants';
import { calculateHourlySales, calculateProductMargins, calculateComboPerformance } from '../../services/analytics';

const SalesDashboard: React.FC = () => {
  const { orders, knownCategories, products, recipes, supplyItems } = useShop();
  const { theme } = useTheme();

  const today = useMemo(() => new Date(), []);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
  });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const todaysOrders = useMemo(() =>
    orders.filter(o =>
      (o.status === OrderStatus.PAID || o.status === OrderStatus.PREPARING || o.status === OrderStatus.COMPLETED) &&
      new Date(o.timestamp).toDateString() === today.toDateString()
    ),
    [orders, today]);
  const totalSalesToday = useMemo(() => todaysOrders.reduce((sum, o) => sum + o.finalAmount, 0), [todaysOrders]);
  const cashSalesToday = useMemo(() => todaysOrders.filter(o => o.paymentMethod === 'Cash').reduce((sum, o) => sum + o.finalAmount, 0), [todaysOrders]);
  const qrSalesToday = useMemo(() => todaysOrders.filter(o => o.paymentMethod === 'QR').reduce((sum, o) => sum + o.finalAmount, 0), [todaysOrders]);


  const filteredSalesData = useMemo(() => {
    let filtered = orders.filter(o =>
      o.status === OrderStatus.PAID ||
      o.status === OrderStatus.PREPARING ||
      o.status === OrderStatus.COMPLETED
    );

    if (filters.startDate) {
      filtered = filtered.filter(o => new Date(o.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => new Date(o.timestamp) <= endDate);
    }
    if (filters.category) {
      filtered = filtered.filter(o => o.items.some(item => {
        const productDetails = products.find(p => p.id === item.productId);
        return productDetails?.category === filters.category;
      }));
    }
    return filtered;
  }, [orders, filters.startDate, filters.endDate, filters.category, products]);

  const mainChartData = useMemo(() => {
    const timeSales: { [key: string]: number } = {};
    const rangeMs = (filters.endDate ? new Date(filters.endDate).getTime() : today.getTime()) -
      (filters.startDate ? new Date(filters.startDate).getTime() : 0);
    const rangeDays = rangeMs / (1000 * 60 * 60 * 24);
    const useDaily = filters.startDate && filters.endDate && rangeDays <= 60;

    filteredSalesData.forEach(order => {
      let key: string;
      if (useDaily) {
        key = new Date(order.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
      } else {
        key = new Date(order.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }
      timeSales[key] = (timeSales[key] || 0) + order.finalAmount;
    });

    let dataPoints = Object.entries(timeSales)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    if (dataPoints.length === 0 && (filters.startDate || filters.endDate)) {
      dataPoints.push({ name: new Date(filters.startDate || today).toLocaleDateString(useDaily ? 'en-CA' : 'en-US', { year: 'numeric', month: 'short' }), sales: 0 });
      if (filters.endDate && filters.startDate !== filters.endDate) {
        dataPoints.push({ name: new Date(filters.endDate).toLocaleDateString(useDaily ? 'en-CA' : 'en-US', { year: 'numeric', month: 'short' }), sales: 0 });
      }
    } else if (dataPoints.length === 0) {
      dataPoints.push({ name: new Date().toLocaleDateString('en-US', { month: 'short' }), sales: 0 });
    }

    return dataPoints;
  }, [filteredSalesData, filters.startDate, filters.endDate, today]);

  const salesByCategoryData = useMemo(() => {
    const categorySales: { [category: string]: number } = {};
    filteredSalesData.forEach(order => {
      order.items.forEach(item => {
        const productDetails = products.find(p => p.id === item.productId);
        const category = productDetails?.category || 'Unknown';
        categorySales[category] = (categorySales[category] || 0) + (item.unitPrice * item.quantity);
      });
    });
    return Object.entries(categorySales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSalesData, products]);
  
  const hourlySalesData = useMemo(() => calculateHourlySales(filteredSalesData), [filteredSalesData]);

  const marginAnalysisData = useMemo(() => 
    calculateProductMargins(products, recipes, supplyItems).slice(0, 10), 
  [products, recipes, supplyItems]);

  const comboPerformanceData = useMemo(() => 
    calculateComboPerformance(filteredSalesData).map(d => ({ 
      ...d, 
      color: d.name === 'Combos' ? COFFEE_COLORS.accent : COFFEE_COLORS.medium 
    })), 
  [filteredSalesData]);

  const productPerformanceData = useMemo(() => {
    const productSales: { [name: string]: { sales: number, quantity: number } } = {};
    filteredSalesData.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productName]) {
          productSales[item.productName] = { sales: 0, quantity: 0 };
        }
        productSales[item.productName].sales += item.unitPrice * item.quantity;
        productSales[item.productName].quantity += item.quantity;
      });
    });
    return Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sales - a.sales);
  }, [filteredSalesData]);

  const topSellingProducts = productPerformanceData.slice(0, 5);
  const leastSellingProducts = productPerformanceData.filter(p => p.sales > 0).slice(-5).reverse();

  const totalFilteredSales = useMemo(() => filteredSalesData.reduce((sum, o) => sum + o.finalAmount, 0), [filteredSalesData]);
  const totalFilteredOrders = filteredSalesData.length;
  const avgOrderValueFiltered = totalFilteredOrders > 0 ? totalFilteredSales / totalFilteredOrders : 0;
  const cashSalesFiltered = useMemo(() => filteredSalesData.filter(o => o.paymentMethod === 'Cash').reduce((sum, o) => sum + o.finalAmount, 0), [filteredSalesData]);
  const qrSalesFiltered = useMemo(() => filteredSalesData.filter(o => o.paymentMethod === 'QR').reduce((sum, o) => sum + o.finalAmount, 0), [filteredSalesData]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', category: '' });
  };

  const handleDownloadReport = async () => {
    setIsGeneratingPDF(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      generateSalesReportPDF(filteredSalesData, new Date(), totalFilteredSales, cashSalesFiltered, qrSalesFiltered, filters);
    } catch (error) {
      console.error("Error generating sales PDF:", error);
      alert("Failed to generate PDF report. See console for details.");
    }
    setIsGeneratingPDF(false);
  };

  const categoryOptions = [{ value: '', label: 'All Categories' }, ...knownCategories.map(cat => ({ value: cat, label: cat }))];

  const renderProductList = (list: typeof topSellingProducts, title: string, icon: React.ReactNode) => (
    <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner">
      <h4 className="text-lg font-bold mb-2 text-charcoal-dark dark:text-cream-light flex items-center">{icon}{title}</h4>
      {list.length === 0 ? <p className="text-sm text-charcoal-light">No data for current selection.</p> : (
        <ul className="space-y-2 text-sm">
          {list.map(p => (
            <li key={p.name} className="flex justify-between p-2 hover:bg-cream-light dark:hover:bg-charcoal-dark rounded-md">
              <span className='text-charcoal dark:text-cream-light'>{p.name}</span>
              <span className="font-bold text-charcoal-dark dark:text-cream-light">${p.sales.toFixed(2)} ({p.quantity} sold)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner text-center">
      <h3 className="text-base font-bold text-charcoal-light dark:text-charcoal-light uppercase tracking-wider">{title}</h3>
      <p className="text-3xl font-extrabold text-emerald">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      <section>
        <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light mb-4 flex items-center">
          <FaDollarSign className="mr-2 text-emerald" />Today's Sales Snapshot (USD)
        </h2>
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner text-center">
            <h3 className="text-base font-bold text-charcoal-light uppercase tracking-wider">Today's Sales</h3>
            <p className="text-4xl font-extrabold text-emerald">${totalSalesToday.toFixed(2)}</p>
            <p className="text-sm text-charcoal-light">
              {todaysOrders.length} orders | Cash: ${cashSalesToday.toFixed(2)}, QR: ${qrSalesToday.toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      <hr className="my-8 border-charcoal/10 dark:border-cream-light/10" />

      <section>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
            <FaFilter className="mr-2 text-emerald" />Filtered Sales Analysis (USD)
          </h2>
          <Button onClick={handleDownloadReport} disabled={isGeneratingPDF || filteredSalesData.length === 0} leftIcon={<FaFilePdf />} variant="secondary" size="sm">
            {isGeneratingPDF ? 'Generating...' : "Download PDF"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-cream dark:bg-charcoal-dark/50 rounded-lg shadow-inner">
          <Input type="date" label="Start Date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          <Input type="date" label="End Date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
          <Select label="Category" name="category" options={categoryOptions} value={filters.category} onChange={handleFilterChange} />
          <div className="flex items-end">
            <Button onClick={clearFilters} variant="ghost" size="md" leftIcon={<FaTimesCircle />} className="w-full">Clear</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard title="Total Sales" value={`$${totalFilteredSales.toFixed(2)}`} />
          <StatCard title="Total Orders" value={totalFilteredOrders.toString()} />
          <StatCard title="Avg. Order Value" value={`$${avgOrderValueFiltered.toFixed(2)}`} />
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4 text-charcoal-dark dark:text-cream-light">Sales Trend (Filtered)</h3>
          <div className="h-96 bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              {mainChartData.length > 1 ? (
                <LineChart data={mainChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <XAxis dataKey="name" tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Sales"]}
                    contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)', borderRadius: '0.75rem', border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}` }}
                    labelStyle={{ fontWeight: 'bold', color: theme === 'dark' ? '#f1f5f9' : '#1e293b' }} itemStyle={{ color: theme === 'dark' ? '#e2e8f0' : '#334155' }} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: "14px", color: theme === 'dark' ? '#cbd5e1' : '#475569' }} />
                  <Line type="monotone" dataKey="sales" stroke={COFFEE_COLORS.accent} strokeWidth={3} dot={{ r: 5, fill: COFFEE_COLORS.accent }} activeDot={{ r: 7, stroke: theme === 'dark' ? '#FFF' : '#0f172a', strokeWidth: 2 }} />
                </LineChart>
              ) : mainChartData.length === 1 && mainChartData[0].sales > 0 ? (
                <BarChart data={mainChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <XAxis dataKey="name" tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Sales"]} contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)', borderRadius: '0.75rem', border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}` }} />
                  <Bar dataKey="sales" fill={COFFEE_COLORS.accent} barSize={50} />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-charcoal-light">No sales data for current selection.</div>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-charcoal-dark dark:text-cream-light flex items-center">
              <FaSync className="mr-2 text-emerald" /> Peak Business Hours
            </h3>
            <div className="h-64 bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis dataKey="hour" tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '0.5rem', border: 'none' }}
                    itemStyle={{ color: COFFEE_COLORS.accent, fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" name="Orders" fill={COFFEE_COLORS.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4 text-charcoal-dark dark:text-cream-light flex items-center">
              <FaBrain className="mr-2 text-emerald" /> Top Margin Products (%)
            </h3>
            <div className="h-64 bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginAnalysisData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis type="number" unit="%" tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fill: theme === 'dark' ? '#cbd5e1' : '#475569', fontSize: 10 }} />
                  <Tooltip 
                    formatter={(val: number) => [`${val.toFixed(1)}%`, "Profit Margin"]}
                    contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '0.5rem', border: 'none' }}
                  />
                  <Bar dataKey="margin" fill={COFFEE_COLORS.medium} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner min-h-[400px]">
            <h4 className="text-lg font-bold mb-2 text-charcoal-dark dark:text-cream-light flex items-center"><FaChartPie className="mr-2 text-emerald" />Sales by Category</h4>
            {salesByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={salesByCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {[COFFEE_COLORS.accent, COFFEE_COLORS.dark, COFFEE_COLORS.medium, COFFEE_COLORS.bean, COFFEE_COLORS.light].map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: theme === 'dark' ? '#cbd5e1' : '#475569' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-charcoal-light text-center pt-10">No category sales data.</p>}
          </div>

          <div className="space-y-4">
            {renderProductList(topSellingProducts, "Top 5 Selling Products", <FaSortAmountUp className="mr-2 text-emerald" />)}
            {renderProductList(leastSellingProducts, "Bottom 5 Selling Products", <FaSortAmountDown className="mr-2 text-terracotta" />)}
          </div>
          <div className="bg-cream dark:bg-charcoal-dark/50 p-4 rounded-lg shadow-inner min-h-[400px] flex flex-col">
            <h4 className="text-lg font-bold mb-2 text-charcoal-dark dark:text-cream-light flex items-center"><FaBoxOpen className="mr-2 text-emerald" />Combo vs Regular Sales</h4>
            <div className="flex-grow">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={comboPerformanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {comboPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-4 bg-emerald/5 rounded-lg border border-emerald/10">
              <p className="text-xs text-charcoal-light dark:text-cream-dark italic">
                {comboPerformanceData[1].value > comboPerformanceData[0].value
                  ? "Combos are driving more revenue than regular items! Consider adding more variety."
                  : "Regular items dominate. Try promoting combos at checkout to increase average order value."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SalesDashboard;