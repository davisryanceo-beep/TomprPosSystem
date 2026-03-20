import express from 'express';
import { db } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Helper - not really needed with Supabase but keeping for structure if we want
const dl = async (query) => {
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

// POST /clock-in
// Body: { userId, pin, storeId, timestamp (optional client time) }
router.post('/clock-in', async (req, res) => {
    const { pin, storeId } = req.body;
    // Allow userId from token OR body
    const userId = req.user ? req.user.id : req.body.userId;

    if (!userId || !storeId) {
        return res.status(400).json({ error: 'Missing userId or storeId' });
    }

    try {
        // 1. Verify User
        const { data: user, error: userErr } = await db
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userErr || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check PIN only if NOT authenticated via Token or strict mode
        if (!req.user && user.pin !== pin) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        const now = new Date();

        // Handle Timezone
        let nowLocal = new Date(now);
        if (req.body.timezoneOffset !== undefined) {
            // Client offset is in minutes (e.g. -420 for UTC+7)
            // We SUBTRACT the offset to get local time
            nowLocal = new Date(now.getTime() - (req.body.timezoneOffset * 60000));
        }

        const dateStr = nowLocal.toISOString().split('T')[0]; // YYYY-MM-DD (Local)
        const timeStr = nowLocal.toTimeString().slice(0, 5); // HH:MM (Local)

        // 2. Find Shift for Today
        const { data: shifts, error: shiftErr } = await db
            .from('shifts')
            .select('*')
            .eq('userId', userId)
            .eq('date', dateStr)
            .eq('storeId', storeId)
            .limit(1);

        if (shiftErr) throw shiftErr;
        const shift = shifts && shifts.length > 0 ? shifts[0] : null;

        // 3. Create TimeLog
        const timeLogId = uuidv4();
        const timeLog = {
            id: timeLogId,
            userId,
            userName: `${user.firstName} ${user.lastName}`,
            role: user.role,
            clockInTime: now.toISOString(),
            storeId,
            clockOutTime: null
        };

        const { error: logErr } = await db.from('time_logs').insert(timeLog);
        if (logErr) throw logErr;

        // 4. Check for Rewards & Popup Messages
        let reward = null;
        let popupMessage = null;
        let popupType = 'info'; // 'success', 'warning', 'info'

        if (shift) {
            // Get Store Policy
            const { data: store, error: storeErr } = await db
                .from('stores')
                .select('*')
                .eq('id', storeId)
                .single();

            if (storeErr) throw storeErr;
            const policy = store?.rewardPolicy;

            const [shiftHour, shiftMinute] = shift.startTime.split(':').map(Number);
            const shiftDate = new Date(now);
            shiftDate.setHours(shiftHour, shiftMinute, 0, 0);

            const earlyThreshold = new Date(shiftDate.getTime() - ((policy?.earlyMinutes || 15) * 60000));

            if (now <= earlyThreshold) {
                // EARLY
                if (policy && policy.enabled) {
                    const rewardId = uuidv4();
                    reward = {
                        id: rewardId,
                        userId,
                        userName: `${user.firstName} ${user.lastName}`,
                        storeId,
                        date: dateStr,
                        shiftId: shift.id,
                        status: 'Available',
                        timestamp: now.toISOString()
                    };
                    const { error: rewardErr } = await db.from('staff_rewards').insert(reward);
                    if (rewardErr) throw rewardErr;

                    popupMessage = "Congratulations! You earned a free drink! ☕✨";
                    popupType = 'success';
                } else {
                    popupMessage = "You are early! Great start! 🌟";
                    popupType = 'success';
                }
            } else if (now > shiftDate) {
                // LATE
                const funnyMessages = [
                    "Oops! A bit late today. Run faster next time! 🏃‍♂️💨",
                    "Fashionably late? The coffee missed you! ☕💔",
                    "Ticket #1 for being late! Just kidding, but hurry up! 🐢",
                    "Late! The early bird got the worm (and the coffee). 🐦"
                ];
                popupMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
                popupType = 'warning';
            } else {
                // ON TIME
                popupMessage = "Clocked in on time! Have a great shift! ✅";
                popupType = 'info';
            }
        } else {
            popupMessage = "Clocked in! No shift scheduled for today.";
            popupType = 'info';
        }

        res.json({ success: true, timeLog, reward, popupMessage, popupType });

    } catch (err) {
        console.error("ClockIn Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /clock-out
router.post('/clock-out', async (req, res) => {
    const userId = req.user.id;

    try {
        const { data: user, error: userErr } = await db
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (userErr || !user) {
            return res.status(401).json({ error: 'Invalid User' });
        }

        // Find last open log
        const { data: openLogs, error: logErr } = await db
            .from('time_logs')
            .select('*')
            .eq('userId', userId)
            .is('clockOutTime', null)
            .order('clockInTime', { ascending: false });

        if (logErr) throw logErr;

        if (!openLogs || openLogs.length === 0) {
            return res.status(404).json({ error: "No active shift found" });
        }

        const log = openLogs[0];

        const { error: updateErr } = await db
            .from('time_logs')
            .update({ clockOutTime: new Date().toISOString() })
            .eq('id', log.id);

        if (updateErr) throw updateErr;

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// POST /claim-reward
// Body: { rewardId, productId }
router.post('/claim-reward', async (req, res) => {
    const { rewardId, productId } = req.body;
    const userId = req.user.id;

    try {
        const { data: reward, error: rewardErr } = await db
            .from('staff_rewards')
            .select('*')
            .eq('id', rewardId)
            .single();

        if (rewardErr || !reward) {
            return res.status(404).json({ error: "Reward not found" });
        }

        if (reward.userId !== userId) return res.status(403).json({ error: "Ownership mismatch" });
        if (reward.status !== 'Available') return res.status(400).json({ error: "Reward already claimed or expired" });

        // Get Product Info
        const { data: product, error: productErr } = await db
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (productErr || !product) return res.status(400).json({ error: "Product not found" });

        // Create $0 Order
        const orderId = uuidv4();
        const order = {
            id: orderId,
            storeId: reward.storeId,
            items: [{
                productId: product.id,
                productName: product.name,
                quantity: 1,
                unitPrice: 0, // FREE
                isReward: true
            }],
            totalAmount: 0,
            taxAmount: 0,
            finalAmount: 0,
            status: 'Completed',
            paymentMethod: 'Reward',
            timestamp: new Date().toISOString(),
            history: [{ status: 'Completed', timestamp: new Date().toISOString(), note: 'Staff Reward Claim' }]
        };

        // We can't do a single batch across tables natively as easily, but we can do sequential inserts/updates.
        // It's safer to do an RPC call for transactions in Supabase, but doing it sequentially is okay for now if we assume it doesn't fail mid-way.

        // 1. Insert Order
        const { error: orderErr } = await db.from('orders').insert(order);
        if (orderErr) throw orderErr;

        // 2. Update Reward
        const { error: updateRewardErr } = await db.from('staff_rewards').update({
            status: 'Claimed',
            claimedOrderId: orderId,
            claimedProductId: productId,
            claimedProductName: product.name,
            claimedAt: new Date().toISOString()
        }).eq('id', rewardId);
        if (updateRewardErr) throw updateRewardErr;

        // 3. Deduct Stock (Using a Supabase RPC is best for atomic increment, but let's do read-write for now if no RPC is defined)
        // A simple update is fine.
        const newStock = (product.stock || 0) - 1;
        await db.from('products').update({ stock: newStock }).eq('id', productId);

        res.json({ success: true, order });

    } catch (err) {
        console.error("Claim Reward Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /rewards/:userId
router.get('/rewards/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data: rewards, error } = await db
            .from('staff_rewards')
            .select('*')
            .eq('userId', userId);

        if (error) throw error;
        res.json(rewards);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /history/:userId
router.get('/history/:userId', async (req, res) => {
    const { userId } = req.params;
    if (req.user.id !== userId && req.user.role !== 'Admin') {
        return res.status(403).json({ error: "Access denied" });
    }

    try {
        // Run queries in parallel
        const [rewardsRes, logsRes, leaveRes, userRes] = await Promise.all([
            db.from('staff_rewards').select('*').eq('userId', userId),
            db.from('time_logs').select('*').eq('userId', userId),
            db.from('leave_requests').select('*').eq('userid', userId),
            db.from('users').select('*').eq('id', userId).single()
        ]);

        if (rewardsRes.error) throw rewardsRes.error;
        if (logsRes.error) throw logsRes.error;
        if (leaveRes.error) throw leaveRes.error;
        // User might not exist or error, handled below

        // Process Rewards
        const rewards = (rewardsRes.data || [])
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20);

        // Process Logs
        const logs = (logsRes.data || [])
            .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime())
            .slice(0, 20);

        // Process Leave
        const leaveRequests = (leaveRes.data || [])
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
            .slice(0, 20);

        // Calculate Payroll
        let estimatedEarnings = 0;
        const user = userRes.data;
        if (user) {
            const hourlyRate = user.hourlyRate || 0;

            logs.forEach(log => {
                if (log.clockInTime && log.clockOutTime) {
                    const diff = new Date(log.clockOutTime).getTime() - new Date(log.clockInTime).getTime();
                    const hours = diff / (1000 * 60 * 60);
                    estimatedEarnings += hours * hourlyRate;
                }
            });
        }

        res.json({ rewards, logs, leaveRequests, estimatedEarnings: estimatedEarnings.toFixed(2) });
    } catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ 
            error: "Internal Server Error in History", 
            message: err.message, 
            details: err.details || "No further details",
            hint: err.hint || "No hint available"
        });
    }
});

// POST /leave-request
router.post('/leave-request', async (req, res) => {
    const { startDate, endDate, reason } = req.body;
    const userId = req.user.id;

    try {
        const { data: userData, error: userErr } = await db
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userErr || !userData) {
            return res.status(404).json({ error: "User not found" });
        }

        const requestId = uuidv4();
        const request = {
            id: requestId,
            userid: userId,
            userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username,
            storeId: userData.storeId,
            startDate,
            endDate,
            reason,
            status: 'Pending',
            requestedAt: new Date().toISOString()
        };

        const { error: insertErr } = await db.from('leave_requests').insert(request);
        if (insertErr) throw insertErr;

        res.json({ message: "Leave request submitted successfully", requestId });
    } catch (err) {
        console.error("Leave Request Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /announcements/:storeId
router.get('/announcements/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;

        const { data: allAnns, error } = await db
            .from('announcements')
            .select('*')
            .eq('isArchived', 0)
            .or(`storeId.eq.${storeId},storeId.is.null`);

        if (error) throw error;

        const all = (allAnns || [])
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5); // Limit to top 5

        res.json(all);
    } catch (err) {
        console.error("Announcements Error:", err);
        res.status(500).json({ 
            error: "Internal Server Error in Announcements", 
            message: err.message, 
            details: err.details || "No further details",
            hint: err.hint || "No hint available"
        });
    }
});


// GET /users/:userId
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user.id !== userId) return res.status(403).json({ error: "Access denied" });

        const { data: user, error } = await db
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) return res.status(404).json({ error: "User not found" });

        const { password, pin, ...rest } = user;
        res.json(rest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /shifts/upcoming/:userId
router.get('/shifts/upcoming/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user.id !== userId) return res.status(403).json({ error: "Access denied" });

        const today = new Date().toISOString().split('T')[0];

        const { data: shifts, error } = await db
            .from('shifts')
            .select('*')
            .eq('userId', userId)
            .gte('date', today)
            .order('date', { ascending: true })
            .limit(10);

        if (error) throw error;

        res.json(shifts || []);
    } catch (err) {
        console.error("Roster Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /profile
router.put('/profile', async (req, res) => {
    const userId = req.user.id;
    const { firstName, lastName, pin, password } = req.body;

    try {
        const updates = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (pin) updates.pin = pin;
        if (password) {
            // Strong Password Regex
            const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!strongRegex.test(password)) {
                return res.status(400).json({ error: "Password must be 8+ chars with uppercase, number, & special char." });
            }
            updates.password = await bcrypt.hash(password, 10);
        }

        const { error } = await db
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /tasks/:storeId
router.get('/tasks/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        const { data: tasks, error } = await db
            .from('store_tasks')
            .select('*')
            .eq('storeId', storeId)
            .eq('status', 'Pending');

        if (error) throw error;

        res.json(tasks || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /tasks/:taskId/complete
router.post('/tasks/:taskId/complete', async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.id;

    try {
        const { error } = await db
            .from('store_tasks')
            .update({
                status: 'Completed',
                completedBy: userId,
                completedAt: new Date().toISOString()
            })
            .eq('id', taskId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /orders/pending/:storeId
// Returns count and list of active online orders (Deliveries)
router.get('/orders/pending/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        const { data: rawOrders, error } = await db
            .from('orders')
            .select('*')
            .eq('storeId', storeId)
            .in('status', ['Created', 'Received', 'Preparing']);

        if (error) throw error;

        const orders = rawOrders || [];

        // Sort by timestamp descending (newest first)
        orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Filter for Delivery/Online if needed explicitly in JS if index issues arise
        const onlineOrders = orders.filter(o => o.orderType === 'DELIVERY' || o.orderType === 'PICKUP');

        res.json({
            count: onlineOrders.length,
            latestOrder: onlineOrders.length > 0 ? onlineOrders[0] : null,
            orders: onlineOrders
        });
    } catch (err) {
        console.error("Pending Orders Error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
