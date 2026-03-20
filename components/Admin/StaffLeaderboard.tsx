import React, { useState, useEffect } from 'react';
import { FaTrophy, FaStar, FaUserTie } from 'react-icons/fa';
import { useShop } from '../../contexts/ShopContext';

const StaffLeaderboard: React.FC = () => {
  const { currentStoreId } = useShop();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentStoreId) {
      fetch(`/api/staff-performance?storeId=${currentStoreId}`)
        .then(res => res.json())
        .then(data => {
            setLeaders(data.sort((a: any, b: any) => b.score - a.score));
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [currentStoreId]);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading Leaderboard...</div>;

  return (
    <div className="bg-white dark:bg-charcoal-800 rounded-3xl shadow-xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-charcoal-dark dark:text-cream-light flex items-center">
            <FaTrophy className="text-emerald mr-3" /> Staff Leaderboard
          </h2>
          <p className="text-charcoal-light text-sm mt-1">Top performing team members this month</p>
        </div>
        <div className="bg-emerald/10 text-emerald px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
            {new Date().toLocaleString('default', { month: 'long' })}
        </div>
      </div>

      <div className="space-y-4">
        {leaders.map((staff, index) => (
          <div 
            key={staff.id} 
            className={`
                flex items-center justify-between p-4 rounded-2xl transition-all hover:scale-[1.02]
                ${index === 0 ? 'bg-emerald/5 border-2 border-emerald/20 shadow-lg' : 'bg-cream/20 dark:bg-charcoal-900/50'}
            `}
          >
            <div className="flex items-center space-x-4">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-black text-lg
                ${index === 0 ? 'bg-emerald text-white' : index === 1 ? 'bg-slate-400 text-white' : index === 2 ? 'bg-orange-400 text-white' : 'bg-charcoal-light/20 text-charcoal-light'}
              `}>
                {index + 1}
              </div>
              <div>
                <p className="font-bold text-charcoal-dark dark:text-cream-light flex items-center">
                    {staff.name} {index === 0 && <FaStar className="ml-2 text-emerald animate-bounce" />}
                </p>
                <p className="text-xs text-charcoal-light">{staff.role}</p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-xl font-black text-emerald">{staff.score}</span>
              <span className="text-[10px] block font-bold uppercase tracking-tighter text-charcoal-light">Points</span>
            </div>
          </div>
        ))}
        {leaders.length === 0 && <p className="text-center py-10 text-charcoal-light italic">No performance data yet.</p>}
      </div>

      <div className="mt-8 p-4 bg-charcoal-light/5 rounded-xl border border-dashed border-charcoal-light/20">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-charcoal-light mb-2">How points are calculated:</h4>
        <div className="grid grid-cols-3 gap-2 text-[8px] sm:text-[10px] text-charcoal-light font-medium text-center">
            <div className="p-2 border border-emerald/20 rounded bg-emerald/5">Sales: 1pt/$</div>
            <div className="p-2 border border-emerald/20 rounded bg-emerald/5">Attendance: 50pt/day</div>
            <div className="p-2 border border-emerald/20 rounded bg-emerald/5">Tasks: 20pt/ea</div>
        </div>
      </div>
    </div>
  );
};

export default StaffLeaderboard;
