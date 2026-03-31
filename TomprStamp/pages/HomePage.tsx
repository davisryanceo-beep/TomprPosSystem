import React from 'react';
import { FaStore, FaChartLine, FaUsers, FaBoxes, FaMobile, FaCloud, FaLock, FaClock, FaArrowRight, FaCheckCircle, FaStar, FaGem, FaRocket } from 'react-icons/fa';

const HomePage: React.FC = () => {
    // --- SOFT MOUSE FOLLOWER (LERP) ---
    const cursorRef = React.useRef<HTMLDivElement>(null);
    const cursorTarget = React.useRef({ x: 0, y: 0 });
    const cursorCurrent = React.useRef({ x: 0, y: 0 });

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            cursorTarget.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMouseMove);

        let animationFrameId: number;

        const animatecursor = () => {
            if (!cursorRef.current) return;

            // LERP: Current += (Target - Current) * factor
            const factor = 0.1; // Lower = softer/slower delay
            cursorCurrent.current.x += (cursorTarget.current.x - cursorCurrent.current.x) * factor;
            cursorCurrent.current.y += (cursorTarget.current.y - cursorCurrent.current.y) * factor;

            cursorRef.current.style.transform = `translate3d(${cursorCurrent.current.x}px, ${cursorCurrent.current.y}px, 0) translate(-50%, -50%)`;

            animationFrameId = requestAnimationFrame(animatecursor);
        };
        animatecursor();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="min-h-screen font-sans bg-gray-50 text-gray-900 overflow-x-hidden relative selection:bg-emerald-500/30">
            {/* SOFT CURSOR FOLLOWER */}
            <div
                ref={cursorRef}
                className="pointer-events-none fixed top-0 left-0 z-40 w-96 h-96 bg-emerald-400/20 rounded-full blur-[80px] mix-blend-multiply opacity-0 sm:opacity-100 transition-opacity duration-500"
                style={{ willChange: 'transform' }} // Optimization
            />

            {/* Background Gradient Orbs (Ambient) */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-60">
                {/* Orb 1 */}
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-100/40 blur-[100px] animate-blob" />
                {/* Orb 2 */}
                <div className="absolute top-[20%] right-[-20%] w-[50vw] h-[50vw] rounded-full bg-teal-100/40 blur-[100px] animate-blob animation-delay-2000" />
            </div>

            {/* Navigation - Glassmorphism */}
            <nav className="fixed w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
                            <span className="text-xl text-white"><FaStore /></span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                                ទំព័រ FlowsPOS
                            </h1>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">FlowsPOS</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
                        <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</a>
                        <a href="#customers" className="hover:text-emerald-600 transition-colors">Customers</a>
                    </div>
                    <div className="flex items-center space-x-4">
                        <a href="#/login">
                            <button className="text-emerald-600 font-semibold hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors">
                                Login
                            </button>
                        </a>
                        <a href="#/register">
                            <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-all transform hover:scale-105 shadow-lg shadow-emerald-600/20 font-medium">
                                Get Started
                            </button>
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Dynamic & Wide */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-50/50 to-white -z-10"></div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-teal-50/50 to-transparent -z-10 rounded-bl-[100px]"></div>

                <div className="container mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 mb-8 animate-fade-in-up">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        <span className="text-sm font-semibold text-gray-600">The #1 Choice for Modern Cafes</span>
                    </div>

                    <h2 className="text-5xl lg:text-7xl font-extrabold text-charcoal-dark mb-6 leading-tight tracking-tight">
                        Brew Success with <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Intelligent Management</span>
                    </h2>

                    <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Say goodbye to chaos. Our all-in-one POS orchestrates your orders, inventory, and staff so you can focus on the coffee.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
                        <a href="#/register">
                            <button className="px-8 py-4 bg-emerald-600 text-white rounded-xl text-lg font-bold shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
                                <span>Start Free Trial</span>
                                <FaArrowRight />
                            </button>
                        </a>
                        <button className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl text-lg font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm">
                            <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs"><FaStore /></span>
                            <span>Live Demo</span>
                        </button>
                    </div>

                    {/* Stats / Trust Badges */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t border-gray-100 pt-12">
                        {[
                            { label: "Active Users", value: "2,000+" },
                            { label: "Transactions", value: "$50M+" },
                            { label: "Uptime", value: "99.99%" },
                            { label: "Support", value: "24/7" },
                        ].map((stat, i) => (
                            <div key={i}>
                                <p className="text-3xl font-bold text-charcoal-dark">{stat.value}</p>
                                <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid - Bento Box Style */}
            <section id="features" className="py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h3 className="text-4xl font-bold text-gray-900 mb-4">Everything on the Menu</h3>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                            Powerful tools baked into a beautiful interface.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Large Featured Item */}
                        <div className="md:col-span-2 bg-gradient-to-br from-emerald-50 to-white p-10 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
                            <div className="relative z-10">
                                <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 text-2xl group-hover:scale-110 transition-transform">
                                    <FaMobile />
                                </div>
                                <h4 className="text-2xl font-bold mb-3 text-gray-900">Lightning Fast POS</h4>
                                <p className="text-gray-600 max-w-md">Engineered for speed. Process transactions in seconds with an interface your baristas will love. Offline mode included.</p>
                            </div>
                            <div className="absolute right-[-20px] bottom-[-20px] w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                        </div>

                        {/* Standard Items */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-lg transition-all group">
                            <div className="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-amber-600 text-xl group-hover:rotate-12 transition-transform">
                                <FaBoxes />
                            </div>
                            <h4 className="text-xl font-bold mb-2 text-gray-900">Inventory</h4>
                            <p className="text-gray-500 text-sm">Real-time tracking down to the ingredient layer. Auto-reordering alerts.</p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-lg transition-all group">
                            <div className="bg-purple-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-purple-600 text-xl group-hover:rotate-12 transition-transform">
                                <FaUsers />
                            </div>
                            <h4 className="text-xl font-bold mb-2 text-gray-900">Staff Mgmt</h4>
                            <p className="text-gray-500 text-sm">Shift scheduling, role-based access control, and payroll reports.</p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-lg transition-all group">
                            <div className="bg-pink-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-pink-600 text-xl group-hover:rotate-12 transition-transform">
                                <FaChartLine />
                            </div>
                            <h4 className="text-xl font-bold mb-2 text-gray-900">Analytics</h4>
                            <p className="text-gray-500 text-sm">Visual sales trends, best-seller reports, and profit margin analysis.</p>
                        </div>

                        <div className="md:col-span-1 bg-gray-900 p-8 rounded-3xl shadow-lg relative overflow-hidden group">
                            <div className="relative z-10 text-white">
                                <div className="bg-gray-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-white text-xl">
                                    <FaCloud />
                                </div>
                                <h4 className="text-xl font-bold mb-2">Cloud Synced</h4>
                                <p className="text-gray-400 text-sm">Access your business from anywhere. Safe, secure, and always backed up.</p>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500 to-transparent opacity-20 rounded-bl-full"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section - BRAND NEW */}
            <section id="pricing" className="py-24 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-emerald-600 font-bold tracking-wider uppercase text-sm">Simple Pricing</span>
                        <h3 className="text-4xl font-bold text-gray-900 mt-2 mb-4">Choose Your Plan</h3>
                        <p className="text-lg text-gray-500">Transparent pricing. No hidden fees. Cancel anytime.</p>

                        {/* Toggle (Visual) */}
                        <div className="flex items-center justify-center mt-8 gap-4">
                            <span className="text-sm font-semibold text-gray-900">Monthly</span>
                            <div className="w-14 h-8 bg-emerald-600 rounded-full p-1 cursor-pointer">
                                <div className="w-6 h-6 bg-white rounded-full shadow-md transform translate-x-6"></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-400">Yearly (Save 20%)</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">

                        {/* Starter Plan */}
                        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-xl transition-all">
                            <div className="mb-6">
                                <h4 className="text-xl font-bold text-gray-900">Starter</h4>
                                <p className="text-sm text-gray-500 mt-1">For small cafes just starting out.</p>
                            </div>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">$29</span>
                                <span className="text-gray-400">/month</span>
                            </div>
                            <button className="w-full py-3 px-4 border border-emerald-600 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors mb-8">
                                Start Free Trial
                            </button>
                            <ul className="space-y-4 text-sm text-gray-600">
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> 1 POS Terminal</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> Basic Inventory</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> Up to 5 Staff</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> Email Support</li>
                            </ul>
                        </div>

                        {/* Professional Plan - Highlighted */}
                        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl relative transform scale-105 z-10">
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                MOST POPULAR
                            </div>
                            <div className="mb-6">
                                <h4 className="text-xl font-bold text-white">Professional</h4>
                                <p className="text-sm text-gray-400 mt-1">For growing businesses.</p>
                            </div>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">$79</span>
                                <span className="text-gray-500">/month</span>
                            </div>
                            <button className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all mb-8">
                                Get Started
                            </button>
                            <ul className="space-y-4 text-sm text-gray-300">
                                <li className="flex items-center gap-3"><span className="text-emerald-400"><FaCheckCircle /></span> 3 POS Terminals</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-400"><FaCheckCircle /></span> Advanced Inventory & Recipes</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-400"><FaCheckCircle /></span> Unlimited Staff</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-400"><FaCheckCircle /></span> Advanced Analytics</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-400"><FaCheckCircle /></span> Customer Loyalty Program</li>
                            </ul>
                        </div>

                        {/* Enterprise Plan */}
                        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm hover:shadow-xl transition-all">
                            <div className="mb-6">
                                <h4 className="text-xl font-bold text-gray-900">Enterprise</h4>
                                <p className="text-sm text-gray-500 mt-1">For chains & franchises.</p>
                            </div>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">Custom</span>
                            </div>
                            <button className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors mb-8">
                                Contact Sales
                            </button>
                            <ul className="space-y-4 text-sm text-gray-600">
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> Unlimited Terminals</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> Multi-Store Management</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> API Access</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> Dedicated Account Manager</li>
                                <li className="flex items-center gap-3"><span className="text-emerald-500"><FaCheckCircle /></span> Priority 24/7 Support</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="customers" className="py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl font-bold text-gray-900 mb-4">Trusted by Cafe Owners</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-gray-50 p-6 rounded-2xl">
                                <div className="flex text-amber-400 mb-4">
                                    <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                                </div>
                                <p className="text-gray-600 mb-6 italic">"This system completely changed how we run our morning rush. It's incredibly fast and the inventory tools saved us so much money on waste."</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">Sarah Jenkins</p>
                                        <p className="text-xs text-gray-500">Owner, Bean & Brew</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-gray-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-900/20 to-transparent"></div>
                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl font-bold text-white mb-6">Ready to upgrade your cafe?</h2>
                    <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">Join the platform that powers the world's best coffee shops. Start your free 14-day trial today.</p>
                    <a href="#/register">
                        <button className="bg-emerald-500 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-emerald-400 transition-all shadow-lg hover:shadow-emerald-500/40">
                            Get Started Now
                        </button>
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 py-12">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="bg-emerald-600 p-1.5 rounded-lg">
                                    <span className="text-white text-sm"><FaStore /></span>
                                </div>
                                <span className="font-bold text-gray-900">FlowsPOS</span>
                            </div>
                            <p className="text-gray-500 text-sm">Empowering cafes with modern technology.</p>
                        </div>
                        <div>
                            <h5 className="font-bold text-gray-900 mb-4">Product</h5>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><a href="#" className="hover:text-emerald-600">Features</a></li>
                                <li><a href="#" className="hover:text-emerald-600">Pricing</a></li>
                                <li><a href="#" className="hover:text-emerald-600">Integrations</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold text-gray-900 mb-4">Company</h5>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><a href="#" className="hover:text-emerald-600">About Us</a></li>
                                <li><a href="#" className="hover:text-emerald-600">Careers</a></li>
                                <li><a href="#" className="hover:text-emerald-600">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold text-gray-900 mb-4">Legal</h5>
                            <ul className="space-y-2 text-sm text-gray-500">
                                <li><a href="#" className="hover:text-emerald-600">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-emerald-600">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-8 text-center text-sm text-gray-400">
                        <p>&copy; 2026 PosCafe System. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
