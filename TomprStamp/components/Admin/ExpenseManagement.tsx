import React, { useState, useEffect } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Shared/Button';
import Input from '../Shared/Input';
import { FaPlus, FaTrash, FaMoneyBillWave, FaFilter } from 'react-icons/fa';

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  reportedBy: string;
  reportedByName: string;
  storeId: string;
}

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Marketing', 'Inventory (Non-System)', 
  'Staff Costs', 'Repairs & Maintenance', 'Supplies (Misc)', 'Other'
];

const ExpenseManagement: React.FC = () => {
  const { currentStoreId } = useShop();
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    description: ''
  });

  const fetchExpenses = async () => {
    if (!currentStoreId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/expenses?storeId=${currentStoreId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [currentStoreId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStoreId || !currentUser) return;

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount),
          storeId: currentStoreId,
          reportedBy: currentUser.id,
          reportedByName: currentUser.username
        })
      });

      if (response.ok) {
        setShowAddForm(false);
        setNewExpense({
          date: new Date().toISOString().split('T')[0],
          category: EXPENSE_CATEGORIES[0],
          amount: '',
          description: ''
        });
        fetchExpenses();
      }
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) fetchExpenses();
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extrabold text-charcoal-dark dark:text-cream-light flex items-center gap-2">
          <FaMoneyBillWave className="text-emerald" /> Expense Tracking
        </h2>
        <Button onClick={() => setShowAddForm(!showAddForm)} leftIcon={<FaPlus />}>
          {showAddForm ? 'Cancel' : 'Log Expense'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddExpense} className="bg-cream dark:bg-charcoal p-6 rounded-xl shadow-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border border-emerald/20">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-charcoal-light">Date</label>
            <Input 
              id="date"
              type="date"
              value={newExpense.date}
              onChange={e => setNewExpense({...newExpense, date: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-charcoal-light">Category</label>
            <select 
              value={newExpense.category}
              onChange={e => setNewExpense({...newExpense, category: e.target.value})}
              className="w-full p-3 rounded-lg border border-charcoal/10 dark:border-cream/10 bg-white dark:bg-charcoal-dark text-charcoal dark:text-cream-light font-bold"
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-charcoal-light">Amount</label>
            <Input 
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newExpense.amount}
              onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-charcoal-light">Description</label>
            <Input 
              id="desc"
              placeholder="e.g. Monthly electricity bill"
              value={newExpense.description}
              onChange={e => setNewExpense({...newExpense, description: e.target.value})}
            />
          </div>
          <div className="lg:col-span-4 flex justify-end">
            <Button type="submit" variant="primary">Save Expense Record</Button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-charcoal rounded-xl shadow-xl overflow-hidden border border-charcoal/5 dark:border-cream/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cream dark:bg-charcoal-dark/50 text-charcoal-light text-xs font-bold uppercase tracking-wider">
              <th className="p-4">Date</th>
              <th className="p-4">Category</th>
              <th className="p-4">Description</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Reported By</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5 dark:divide-cream/5">
            {loading ? (
              <tr><td colSpan={6} className="p-10 text-center text-charcoal-light">Loading expenses...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-charcoal-light">No expense records found.</td></tr>
            ) : (
              expenses.map(expense => (
                <tr key={expense.id} className="text-sm text-charcoal-dark dark:text-cream-light hover:bg-cream/50 dark:hover:bg-charcoal-dark/30 transition-colors">
                  <td className="p-4 font-mono">{expense.date}</td>
                  <td className="p-4"><span className="px-2 py-1 rounded bg-emerald/10 text-emerald text-xs font-bold">{expense.category}</span></td>
                  <td className="p-4 italic">{expense.description || '-'}</td>
                  <td className="p-4 font-extrabold text-emerald">${expense.amount.toFixed(2)}</td>
                  <td className="p-4">{expense.reportedByName}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDeleteExpense(expense.id)} className="text-terracotta hover:scale-110 transition-transform"><FaTrash /></button>
                  </td>
                </tr>
              ))
             )}
          </tbody>
          {!loading && expenses.length > 0 && (
            <tfoot>
              <tr className="bg-cream dark:bg-charcoal-dark/50 font-extrabold">
                <td colSpan={3} className="p-4 text-right uppercase text-xs">Total Expenses:</td>
                <td className="p-4 text-emerald text-lg">${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ExpenseManagement;
