import React, { useState, useEffect } from 'react';
import { FaStamp, FaGift, FaHistory, FaCoffee } from 'react-icons/fa';
import Button from '../components/Shared/Button';

const LoyaltyPortal: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchLoyalty = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      // Mock or real API call for loyalty data
      const res = await fetch(`/api/loyalty-check?phone=${phone}`);
      const data = await res.json();
      setCustomerData(data);
    } catch (err) {
      console.error(err);
      alert("Error fetching loyalty data. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center p-4 sm:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-black text-charcoal-dark flex items-center justify-center">
          <FaCoffee className="mr-3 text-emerald" /> Tompr Stamp
        </h1>
        <p className="text-charcoal-light mt-2">Check your rewards & stamps anytime!</p>
      </header>

      {!customerData ? (
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-xl font-bold mb-6 text-center">Enter your phone number</h2>
          <div className="space-y-4">
            <input 
              type="tel" 
              placeholder="012 345 678"
              className="w-full p-4 text-xl tracking-widest text-center border-2 border-cream rounded-xl focus:border-emerald outline-none transition-colors"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button 
              fullWidth 
              size="lg" 
              onClick={fetchLoyalty}
              loading={loading}
            >
              Check My Stamps
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
            <h2 className="text-2xl font-bold text-charcoal-dark">Welcome back, {customerData.name || 'Guest'}!</h2>
            <div className="mt-6 flex justify-center items-center space-x-4">
              <div className="p-6 bg-emerald/10 rounded-full">
                <FaStamp className="text-5xl text-emerald" />
              </div>
              <div className="text-left">
                <span className="text-5xl font-black text-emerald">{customerData.stamps || 0}</span>
                <span className="block text-charcoal-light uppercase text-xs font-bold tracking-widest">Available Stamps</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border-b-4 border-emerald">
              <h3 className="font-bold flex items-center text-charcoal-dark mb-4 group">
                <FaGift className="mr-2 text-emerald group-hover:scale-110 transition-transform" /> 
                Recent Rewards
              </h3>
              <ul className="space-y-3">
                {customerData.rewards?.map((r: any, i: number) => (
                  <li key={i} className="flex justify-between items-center text-sm p-2 bg-cream/30 rounded-lg">
                    <span>{r.name}</span>
                    <span className="text-emerald font-bold">{r.status}</span>
                  </li>
                )) || <p className="text-xs text-charcoal-light italic">No rewards available yet.</p>}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border-b-4 border-emerald">
              <h3 className="font-bold flex items-center text-charcoal-dark mb-4 group">
                <FaHistory className="mr-2 text-emerald group-hover:rotate-12 transition-transform" /> 
                Visit History
              </h3>
              <ul className="space-y-3">
                {customerData.history?.map((h: any, i: number) => (
                  <li key={i} className="flex justify-between items-center text-sm p-2 bg-cream/30 rounded-lg">
                    <span>{new Date(h.date).toLocaleDateString()}</span>
                    <span className="font-bold">{h.stampsEarned} stamps</span>
                  </li>
                )) || <p className="text-xs text-charcoal-light italic">No visits recorded yet.</p>}
              </ul>
            </div>
          </div>

          <button 
            onClick={() => setCustomerData(null)}
            className="w-full text-charcoal-light hover:text-emerald text-sm py-4 underline underline-offset-4"
          >
            Check another number
          </button>
        </div>
      )}

      <footer className="mt-12 text-center text-charcoal-light/50 text-xs">
        <p>© 2024 Tompr Specialty Cafe. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LoyaltyPortal;
