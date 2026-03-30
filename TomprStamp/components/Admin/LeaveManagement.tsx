import React, { useState } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { LeaveRequest } from '../../types';
import Button from '../Shared/Button';
import { FaCheck, FaTimes, FaCalendarTimes } from 'react-icons/fa';

const LeaveManagement: React.FC = () => {
    const { leaveRequests, updateLeaveRequest } = useShop();
    const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

    const filteredRequests = leaveRequests.filter(req => {
        if (filter === 'All') return true;
        return req.status === filter;
    });

    const handleAction = async (requestId: string, status: 'Approved' | 'Rejected') => {
        const note = window.prompt(`Enter a note for this ${status.toLowerCase()} request (optional):`);
        try {
            await updateLeaveRequest(requestId, status, note || undefined);
        } catch (e) {
            alert("Failed to update request");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-charcoal-dark dark:text-cream-light flex items-center">
                    <span className="mr-3 text-emerald"><FaCalendarTimes /></span>
                    Leave Requests
                </h2>
                <div className="flex space-x-2">
                    {['Pending', 'Approved', 'Rejected', 'All'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === s
                                ? 'bg-emerald text-white shadow-md'
                                : 'bg-cream dark:bg-charcoal-dark text-charcoal-light hover:bg-cream-dark'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-cream-light dark:bg-charcoal-dark rounded-xl shadow-lg border border-cream dark:border-charcoal-light/10 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-cream dark:bg-charcoal-dark/50">
                        <tr>
                            <th className="px-6 py-4 font-bold text-charcoal-light">Staff Member</th>
                            <th className="px-6 py-4 font-bold text-charcoal-light">Dates</th>
                            <th className="px-6 py-4 font-bold text-charcoal-light">Reason</th>
                            <th className="px-6 py-4 font-bold text-charcoal-light text-center">Status</th>
                            <th className="px-6 py-4 font-bold text-charcoal-light text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cream dark:divide-charcoal-light/10">
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-charcoal-light italic">
                                    No {filter.toLowerCase()} leave requests found.
                                </td>
                            </tr>
                        ) : (
                            filteredRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-cream dark:hover:bg-charcoal-dark/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-charcoal-dark dark:text-cream-light">{req.userName}</div>
                                        <div className="text-xs text-charcoal-light">ID: {req.userId.slice(-6)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold">{req.startDate}</div>
                                        <div className="text-xs text-charcoal-light">to {req.endDate}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-charcoal-dark dark:text-cream-light max-w-xs truncate" title={req.reason}>
                                            {req.reason}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'Approved' ? 'bg-emerald/20 text-emerald' :
                                                req.status === 'Rejected' ? 'bg-rose-500/20 text-rose-500' :
                                                    'bg-amber-500/20 text-amber-500'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {req.status === 'Pending' && (
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => handleAction(req.id, 'Approved')}
                                                    className="p-2 bg-emerald text-white rounded-lg hover:bg-emerald-dark transition-colors"
                                                    title="Approve"
                                                >
                                                    <FaCheck />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, 'Rejected')}
                                                    className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                                                    title="Reject"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                        {req.status !== 'Pending' && (
                                            <div className="text-xs text-charcoal-light">
                                                Responded at: {req.respondedAt ? new Date(req.respondedAt).toLocaleDateString() : '-'}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LeaveManagement;
