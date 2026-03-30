import React, { useState, useMemo } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { Role, User, LeaveRequest, OvertimeRequest, TimeLog } from '../../types';
import { 
    FaUserTie, FaCalendarTimes, FaClock, FaMoneyBillWave, 
    FaCheck, FaTimes, FaCalculator, FaEdit, FaSave, FaExclamationTriangle 
} from 'react-icons/fa';

type TabType = 'Staff' | 'Leave' | 'Overtime' | 'Payroll';

const StaffManagement: React.FC = () => {
    const { 
        allUsers, leaveRequests, overtimeRequests, timeLogs, currentStoreId,
        updateLeaveRequest, addOvertimeRequest, updateOvertimeRequest, updateUserSalary 
    } = useShop();

    const [activeTab, setActiveTab] = useState<TabType>('Staff');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editSalary, setEditSalary] = useState<number>(0);
    const [editHourlyRate, setEditHourlyRate] = useState<number>(0);
    const [editMonthlyDayOffAllowance, setEditMonthlyDayOffAllowance] = useState<number>(0);

    // Filters & Sorting
    const [leaveFilter, setLeaveFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');
    const [otFilter, setOtFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

    // Data filtering
    const storeStaff = useMemo(() => {
        return allUsers.filter(u => u.storeId === currentStoreId || (!u.storeId && u.role === Role.ADMIN));
    }, [allUsers, currentStoreId]);

    const filteredLeave = useMemo(() => {
        return leaveRequests.filter(req => {
            if (leaveFilter === 'All') return true;
            return req.status === leaveFilter;
        });
    }, [leaveRequests, leaveFilter]);

    const filteredOT = useMemo(() => {
        return overtimeRequests.filter(req => {
            if (otFilter === 'All') return true;
            return req.status === otFilter;
        });
    }, [overtimeRequests, otFilter]);

    // Handle Salary Update
    const handleStartEdit = (user: User) => {
        setEditingUserId(user.id);
        setEditSalary(user.salary || 0);
        setEditHourlyRate(user.hourlyRate || 0);
        setEditMonthlyDayOffAllowance(user.monthlyDayOffAllowance || 0);
    };

    const handleSaveSalary = async (userId: string) => {
        const success = await updateUserSalary(userId, editSalary, editHourlyRate, editMonthlyDayOffAllowance);
        if (success) {
            setEditingUserId(null);
        } else {
            alert("Failed to update salary configuration.");
        }
    };

    // Calculate Payroll for a user (Simplified for demonstration)
    const calculateUserPayroll = (user: User) => {
        const baseSalary = user.salary || 0;
        const hourlyRate = user.hourlyRate || 0;

        // Calculate approved OT hours
        const approvedOTHours = overtimeRequests
            .filter(ot => ot.userId === user.id && ot.status === 'Approved')
            .reduce((sum, ot) => sum + (ot.approvedHours || 0), 0);
        
        const otPay = approvedOTHours * hourlyRate * 1.5;

        // Deductions (Mock logic for now, could be based on missed hours/days)
        const deductions = 0; 
        
        const netPay = baseSalary + otPay - deductions;

        return { baseSalary, otPay, deductions, netPay, approvedOTHours };
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-charcoal-dark dark:text-cream-light flex items-center tracking-tight">
                        <span className="mr-3 p-3 bg-emerald/10 text-emerald rounded-2xl shadow-sm">
                            <FaUserTie />
                        </span>
                        Staff Management Hub
                    </h2>
                    <p className="text-charcoal-light text-sm mt-1">Configure salaries, manage requests, and calculate payroll.</p>
                </div>

                <div className="flex p-1 bg-cream-dark/30 dark:bg-charcoal-dark/50 rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
                    {(['Staff', 'Leave', 'Overtime', 'Payroll'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                                activeTab === tab
                                    ? 'bg-emerald text-white shadow-lg transform scale-105'
                                    : 'text-charcoal-light hover:text-charcoal-dark dark:hover:text-cream-light hover:bg-white/5'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'Staff' && (
                    <div className="bg-cream-light dark:bg-charcoal-dark rounded-2xl shadow-xl border border-cream dark:border-charcoal-light/10 overflow-hidden backdrop-blur-sm">
                        <table className="w-full text-left">
                            <thead className="bg-cream dark:bg-charcoal-dark/50 border-b border-cream dark:border-charcoal-light/10">
                                <tr>
                                    <th className="px-6 py-5 font-bold text-charcoal-light uppercase text-xs tracking-wider">Staff Details</th>
                                    <th className="px-6 py-5 font-bold text-charcoal-light uppercase text-xs tracking-wider text-right">Base Salary ($)</th>
                                    <th className="px-6 py-5 font-bold text-charcoal-light uppercase text-xs tracking-wider text-right">OT Rate ($/hr)</th>
                                    <th className="px-6 py-5 font-bold text-charcoal-light uppercase text-xs tracking-wider text-right">Day Offs/Mo</th>
                                    <th className="px-6 py-5 font-bold text-charcoal-light uppercase text-xs tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cream dark:divide-charcoal-light/10">
                                {storeStaff.map((user) => (
                                    <tr key={user.id} className="hover:bg-cream/40 dark:hover:bg-charcoal-dark/30 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-charcoal/10 dark:bg-cream/10 flex items-center justify-center text-emerald font-bold border border-emerald/20">
                                                    {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-charcoal-dark dark:text-cream-light group-hover:text-emerald transition-colors">
                                                        {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}
                                                    </div>
                                                    <div className="text-xs text-charcoal-light flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 bg-charcoal-light/10 rounded uppercase text-[10px]">{user.role}</span>
                                                        ID: {user.id.slice(-6)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {editingUserId === user.id ? (
                                                <input 
                                                    type="number" 
                                                    value={editSalary} 
                                                    onChange={(e) => setEditSalary(parseFloat(e.target.value) || 0)}
                                                    className="w-24 px-2 py-1 rounded bg-cream dark:bg-charcoal-dark border border-emerald text-right focus:ring-2 focus:ring-emerald outline-none"
                                                />
                                            ) : (
                                                <span className="font-mono text-charcoal-dark dark:text-cream-light">${(user.salary || 0).toLocaleString()}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {editingUserId === user.id ? (
                                                <input 
                                                    type="number" 
                                                    value={editHourlyRate} 
                                                    onChange={(e) => setEditHourlyRate(parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 rounded bg-cream dark:bg-charcoal-dark border border-emerald text-right focus:ring-2 focus:ring-emerald outline-none"
                                                />
                                            ) : (
                                                <span className="font-mono text-charcoal-dark dark:text-cream-light">${(user.hourlyRate || 0).toFixed(2)}/hr</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {editingUserId === user.id ? (
                                                <input 
                                                    type="number" 
                                                    value={editMonthlyDayOffAllowance} 
                                                    onChange={(e) => setEditMonthlyDayOffAllowance(parseFloat(e.target.value) || 0)}
                                                    className="w-16 px-2 py-1 rounded bg-cream dark:bg-charcoal-dark border border-emerald text-right focus:ring-2 focus:ring-emerald outline-none"
                                                />
                                            ) : (
                                                <span className="font-mono text-charcoal-dark dark:text-cream-light">{user.monthlyDayOffAllowance || 0} days</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {editingUserId === user.id ? (
                                                <button 
                                                    onClick={() => handleSaveSalary(user.id)}
                                                    className="p-2 text-white bg-emerald rounded-lg hover:bg-emerald-dark shadow-md transition-all active:scale-95"
                                                    title="Save"
                                                >
                                                    <FaSave />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleStartEdit(user)}
                                                    className="p-2 text-emerald hover:bg-emerald/10 rounded-lg transition-all"
                                                    title="Edit Salary"
                                                >
                                                    <FaEdit />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'Leave' && (
                    <div className="space-y-4">
                        <div className="flex justify-end gap-2">
                             {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setLeaveFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${leaveFilter === s
                                        ? 'bg-emerald text-white shadow-md'
                                        : 'bg-cream-dark/20 dark:bg-charcoal-dark/50 text-charcoal-light hover:bg-cream-dark'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="bg-cream-light dark:bg-charcoal-dark rounded-2xl shadow-xl border border-cream dark:border-charcoal-light/10 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-cream dark:bg-charcoal-dark/50">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase tracking-wider">Staff</th>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase tracking-wider">Period</th>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase tracking-wider text-center">Status</th>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cream dark:divide-charcoal-light/10">
                                    {filteredLeave.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-charcoal-light italic">No {leaveFilter.toLowerCase()} requests.</td>
                                        </tr>
                                    ) : (
                                        filteredLeave.map((req) => (
                                            <tr key={req.id} className="hover:bg-cream/40 dark:hover:bg-charcoal-dark/30 transition-colors">
                                                <td className="px-6 py-4 font-bold">{req.userName}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div>{req.startDate}</div>
                                                    <div className="text-xs text-charcoal-light">to {req.endDate}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={req.reason}>{req.reason}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase ${
                                                        req.status === 'Approved' ? 'bg-emerald/10 text-emerald' :
                                                        req.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                                                        'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {req.status === 'Pending' && (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => updateLeaveRequest(req.id, 'Approved')} className="p-1.5 text-emerald hover:bg-emerald/10 rounded transition-colors" title="Approve"><FaCheck /></button>
                                                            <button onClick={() => updateLeaveRequest(req.id, 'Rejected')} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors" title="Reject"><FaTimes /></button>
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
                )}

                {activeTab === 'Overtime' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-charcoal-light">Staff OT requests require admin review and hour verification.</p>
                            <div className="flex gap-2">
                                {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setOtFilter(s)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${otFilter === s
                                            ? 'bg-emerald text-white shadow-md'
                                            : 'bg-cream-dark/20 dark:bg-charcoal-dark/50 text-charcoal-light hover:bg-cream-dark'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-cream-light dark:bg-charcoal-dark rounded-2xl shadow-xl border border-cream dark:border-charcoal-light/10 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-cream dark:bg-charcoal-dark/50">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase">Staff</th>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase">Date</th>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase">Requested Hrs</th>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase text-center">Status</th>
                                        <th className="px-6 py-4 font-bold text-charcoal-light text-xs uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cream dark:divide-charcoal-light/10">
                                    {filteredOT.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-charcoal-light italic">No {otFilter.toLowerCase()} overtime requests.</td>
                                        </tr>
                                    ) : (
                                        filteredOT.map((req) => (
                                            <tr key={req.id} className="hover:bg-cream/40 dark:hover:bg-charcoal-dark/30 transition-colors">
                                                <td className="px-6 py-4 font-bold">{req.userName}</td>
                                                <td className="px-6 py-4 text-sm">{req.date}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-emerald">{req.requestedHours} hrs</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                                                        req.status === 'Approved' ? 'bg-emerald/10 text-emerald' :
                                                        req.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                                                        'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {req.status === 'Pending' && (
                                                        <div className="flex justify-end gap-2 items-center">
                                                            <button 
                                                                onClick={async () => {
                                                                    const hours = window.prompt(`Approve hours for ${req.userName} (Requested: ${req.requestedHours}):`, req.requestedHours.toString());
                                                                    if (hours !== null) {
                                                                        await updateOvertimeRequest(req.id, { status: 'Approved', approvedHours: parseFloat(hours) || 0 });
                                                                    }
                                                                }}
                                                                className="p-1.5 text-emerald hover:bg-emerald/10 rounded transition-colors"
                                                                title="Approve"
                                                            >
                                                                <FaCheck />
                                                            </button>
                                                            <button 
                                                                onClick={() => updateOvertimeRequest(req.id, { status: 'Rejected' })}
                                                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                                                                title="Reject"
                                                            >
                                                                <FaTimes />
                                                            </button>
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
                )}

                {activeTab === 'Payroll' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {storeStaff.map((user) => {
                            const { baseSalary, otPay, deductions, netPay, approvedOTHours } = calculateUserPayroll(user);
                            return (
                                <div key={user.id} className="bg-cream-light dark:bg-charcoal-dark p-6 rounded-2xl shadow-xl border border-cream dark:border-charcoal-light/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-charcoal dark:bg-cream flex items-center justify-center text-emerald text-xl font-black">
                                            {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-charcoal-dark dark:text-cream-light">
                                                {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}
                                            </h3>
                                            <span className="text-[10px] px-2 py-0.5 bg-emerald/10 text-emerald rounded-full font-bold uppercase tracking-widest">{user.role}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-charcoal-light font-medium">Base Salary</span>
                                            <span className="font-mono text-charcoal-dark dark:text-cream-light">${baseSalary.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald/80 font-medium flex items-center gap-1">
                                                Overtime <small className="text-[10px] bg-emerald/5 px-1 rounded">({approvedOTHours}h × 1.5)</small>
                                            </span>
                                            <span className="font-mono text-emerald font-bold">+${otPay.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-rose-500/80 font-medium">Deductions</span>
                                            <span className="font-mono text-rose-500">-${deductions.toFixed(2)}</span>
                                        </div>

                                        <div className="pt-4 mt-2 border-t border-cream dark:border-charcoal-light/10 flex justify-between items-end">
                                            <div className="text-xs text-charcoal-light uppercase font-black">Net Payment</div>
                                            <div className="text-2xl font-black text-emerald tracking-tighter drop-shadow-sm">
                                                ${netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>

                                    {(!user.salary || user.salary === 0) && (
                                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-500 text-[10px] font-bold">
                                            <FaExclamationTriangle className="text-lg shrink-0" />
                                            <span>Staff needs salary configuration. Use the 'Staff' tab to set it.</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffManagement;
