"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    motion,
    useInView,
    useScroll,
    useTransform,
    AnimatePresence,
} from "framer-motion";
import {
    IconBrain,
    IconBrandTelegram,
    IconChartBar,
    IconMessagePlus,
    IconSparkles,
    IconLayoutDashboard,
    IconShieldLock,
    IconBuildingBank,
    IconCalendarRepeat,
    IconCash,
    IconArrowRight,
    IconReceipt,
    IconCamera,
} from "@tabler/icons-react";

// ─── Animation Variants ────────────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
};

const fadeIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
};

const slideLeft = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
};

// ─── Scroll-triggered section wrapper ──────────────────────────────────────────

function FadeUpSection({
    children,
    className = "",
    delay = 0,
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });
    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={fadeUp}
            transition={{ duration: 0.6, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ─── Floating orbs background ──────────────────────────────────────────────────

function FloatingOrbs() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {[
                { size: 380, top: "8%", left: "10%", dur: 8, color: "from-primary/20 to-transparent", delay: 0 },
                { size: 280, top: "50%", right: "8%", dur: 10, color: "from-blue-500/15 to-transparent", delay: 2 },
                { size: 220, bottom: "10%", left: "30%", dur: 7, color: "from-purple-500/15 to-transparent", delay: 1 },
            ].map((orb, i) => (
                <motion.div
                    key={i}
                    className={`absolute rounded-full bg-gradient-radial ${orb.color} blur-3xl`}
                    style={{
                        width: orb.size,
                        height: orb.size,
                        top: orb.top,
                        left: (orb as { left?: string }).left,
                        right: (orb as { right?: string }).right,
                        bottom: (orb as { bottom?: string }).bottom,
                    }}
                    animate={{ y: [0, -30, 0], x: [0, 15, 0] }}
                    transition={{
                        duration: orb.dur,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: orb.delay,
                    }}
                />
            ))}
        </div>
    );
}

// ─── Animated stat counter ────────────────────────────────────────────────────

function StatItem({ value, label, delay }: { value: string; label: string; delay: number }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    return (
        <motion.div
            ref={ref}
            className="text-center"
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={fadeUp}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
        >
            <motion.div
                className="text-2xl font-bold sm:text-3xl"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: delay * 0.1 + 0.2, type: "spring", stiffness: 200 }}
            >
                {value}
            </motion.div>
            <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</div>
        </motion.div>
    );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
    icon: Icon,
    iconColor,
    iconBg,
    title,
    description,
    delay,
}: {
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    title: string;
    description: string;
    delay: number;
}) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={fadeIn}
            transition={{ duration: 0.4, delay: delay * 0.06 }}
        >
            <motion.div
                whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex items-start gap-4 rounded-2xl border bg-card p-5"
            >
                <motion.div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
                    whileHover={{ rotate: 8, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                >
                    <Icon className="h-5 w-5" />
                </motion.div>
                <div>
                    <h3 className="mb-1 font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Step item ────────────────────────────────────────────────────────────────

function StepItem({
    number,
    icon: Icon,
    title,
    description,
    delay,
}: {
    number: string;
    icon: React.ElementType;
    title: string;
    description: string;
    delay: number;
}) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });

    return (
        <motion.div
            ref={ref}
            className="flex flex-col items-center text-center"
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={slideLeft}
            transition={{ duration: 0.6, delay: delay * 0.12 }}
        >
            <motion.div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold"
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                {number}
            </motion.div>
            <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
        </motion.div>
    );
}

// ─── Floating Telegram chat bubble mock ───────────────────────────────────────

function TelegramMock() {
    const messages = [
        { text: "Lunch 450", sent: true },
        { text: "✅ Logged: ₹450 → Food", sent: false },
        { text: "Uber 280", sent: true },
        { text: "✅ Logged: ₹280 → Travel", sent: false },
        { text: "show spending", sent: true },
        { text: "📊 This month: ₹12,400\n🍔 Food 40% · 🚗 Travel 25%", sent: false },
    ];

    return (
        <motion.div
            className="relative mx-auto w-72 overflow-hidden rounded-2xl border bg-card shadow-2xl"
            initial={{ opacity: 0, y: 40, rotateY: -10 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
            {/* Telegram header */}
            <div className="flex items-center gap-2 border-b bg-blue-500 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <IconBrandTelegram className="h-4 w-4 text-white" />
                </div>
                <div>
                    <p className="text-sm font-medium text-white">Chamber Bot</p>
                    <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
                        <p className="text-xs text-white/70">online</p>
                    </div>
                </div>
            </div>
            {/* Messages */}
            <div className="space-y-2 p-3">
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
                        initial={{ opacity: 0, x: msg.sent ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.25, duration: 0.4 }}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs whitespace-pre-line ${msg.sent
                                ? "rounded-tr-sm bg-blue-500 text-white"
                                : "rounded-tl-sm bg-muted text-foreground"
                                }`}
                        >
                            {msg.text}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

// ─── Ticker tape of features ─────────────────────────────────────────────────

const tickerItems = [
    "✦ Smart Categorization",
    "✦ Budget Tracking",
    "✦ Receipt Scanner",
    "✦ Telegram Bot",
    "✦ Analytics",
    "✦ Subscriptions",
    "✦ Lent Money",
    "✦ Multi-Account",
    "✦ CSV Export",
    "✦ Monthly Summary",
];

function Ticker() {
    return (
        <div className="relative overflow-hidden border-y bg-primary/5 py-3 text-sm font-medium text-primary">
            <motion.div
                className="flex gap-12 whitespace-nowrap"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 25, ease: "linear", repeat: Infinity }}
            >
                {[...tickerItems, ...tickerItems].map((item, i) => (
                    <span key={i}>{item}</span>
                ))}
            </motion.div>
        </div>
    );
}

// ─── FAQ Item (accordion) ─────────────────────────────────────────────────────

function FAQItem({ question, answer, delay }: { question: string; answer: string; delay: number }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-40px" });

    return (
        <motion.div
            ref={ref}
            className="overflow-hidden rounded-xl border bg-card"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay, duration: 0.4 }}
        >
            <button
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium"
                onClick={() => setOpen((o) => !o)}
            >
                <span>{question}</span>
                <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-4 shrink-0 text-lg text-muted-foreground"
                >
                    +
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AnimatedLanding() {
    const { scrollYProgress } = useScroll();
    const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0.95]);

    const features = [
        { icon: IconBrain, iconColor: "text-primary", iconBg: "bg-primary/10", title: "Smart Capture", description: "Send \"Lunch 450\" via Telegram and AI extracts amount, category, and merchant automatically." },
        { icon: IconBrandTelegram, iconColor: "text-blue-500", iconBg: "bg-blue-500/10", title: "Telegram Bot", description: "Link your Telegram account and track expenses on the go. Just send a message or photo." },
        { icon: IconChartBar, iconColor: "text-green-500", iconBg: "bg-green-500/10", title: "Deep Analytics", description: "Visualize spending patterns, track budgets, and import bank statements for reconciliation." },
        { icon: IconBuildingBank, iconColor: "text-purple-500", iconBg: "bg-purple-500/10", title: "Multi-Account Tracking", description: "Track bank accounts, investments, wallets, and credit cards all in one place." },
        { icon: IconCalendarRepeat, iconColor: "text-orange-500", iconBg: "bg-orange-500/10", title: "Subscription Manager", description: "Never miss a renewal. Track recurring subscriptions with calendar view and smart alerts." },
        { icon: IconCash, iconColor: "text-yellow-600", iconBg: "bg-yellow-500/10", title: "Lent Money Tracker", description: "Keep track of money you've lent with repayment progress, due dates, and receipt uploads." },
        { icon: IconReceipt, iconColor: "text-pink-500", iconBg: "bg-pink-500/10", title: "Receipt Gallery", description: "Browse all uploaded receipts in a beautiful grid with search and category filters." },
        { icon: IconCamera, iconColor: "text-indigo-500", iconBg: "bg-indigo-500/10", title: "Monthly Summary", description: "Review your spending month by month with AI-generated insights and beautiful charts." },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <motion.header
                style={{ opacity: headerOpacity }}
                className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md"
            >
                <div className="container mx-auto max-w-6xl flex h-14 items-center justify-between px-4 sm:h-16">
                    <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.div
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold"
                            whileHover={{ rotate: 10, scale: 1.1 }}
                        >
                            C
                        </motion.div>
                        <span className="font-semibold">Chamber</span>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Link href="/dashboard">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                                <Button variant="default" size="sm" className="rounded-md">
                                    <span className="hidden sm:inline">Go to Dashboard</span>
                                    <span className="sm:hidden">Dashboard</span>
                                    <IconArrowRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                            </motion.div>
                        </Link>
                    </motion.div>
                </div>
            </motion.header>

            <main>
                {/* ── Hero Section ─────────────────────────────────────── */}
                <section className="relative container mx-auto max-w-6xl px-4 overflow-hidden">
                    <FloatingOrbs />
                    <div className="relative flex flex-col items-center justify-center px-2 py-16 text-center sm:py-20 md:py-28 lg:flex-row lg:gap-16 lg:text-left lg:py-32">
                        {/* Hero text */}
                        <div className="flex-1">
                            <motion.div
                                className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground sm:mb-6 sm:text-sm"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                            >
                                <motion.span
                                    animate={{ rotate: [0, 15, -10, 15, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                >
                                    <IconSparkles className="h-3.5 w-3.5 text-primary" />
                                </motion.span>
                                AI-powered expense management
                            </motion.div>

                            <motion.h1
                                className="max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.2 }}
                            >
                                Track Every Rupee,{" "}
                                <motion.span
                                    className="text-primary"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                >
                                    Effortlessly
                                </motion.span>
                            </motion.h1>

                            <motion.p
                                className="mt-4 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.35 }}
                            >
                                Eliminate the friction of manual expense tracking. Input anywhere via Telegram or Web, and let AI automatically categorize your spending.
                            </motion.p>

                            <motion.div
                                className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4 lg:justify-start justify-center"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.5 }}
                            >
                                <Link href="/dashboard">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                                        <Button size="lg" className="rounded-md px-6 shadow-md shadow-primary/30">
                                            Get Started Free
                                            <motion.span
                                                animate={{ x: [0, 4, 0] }}
                                                transition={{ duration: 1.2, repeat: Infinity }}
                                            >
                                                <IconArrowRight className="ml-1 h-4 w-4" />
                                            </motion.span>
                                        </Button>
                                    </motion.div>
                                </Link>
                                <Link href="#features">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                                        <Button variant="outline" size="lg" className="rounded-md px-6">
                                            See Features
                                        </Button>
                                    </motion.div>
                                </Link>
                            </motion.div>
                        </div>

                        {/* Hero visual: Telegram mock */}
                        <div className="mt-12 lg:mt-0 lg:flex-shrink-0">
                            <TelegramMock />
                        </div>
                    </div>
                </section>

                {/* ── Ticker ─────────────────────────────────────────────── */}
                <Ticker />

                {/* ── Stats Section ───────────────────────────────────────── */}
                <section className="border-b bg-muted/20">
                    <div className="container mx-auto max-w-6xl grid grid-cols-2 gap-4 px-4 py-10 sm:py-14 md:grid-cols-4 md:gap-8">
                        <StatItem value="100%" label="Free & Open Source" delay={0} />
                        <StatItem value="10+" label="Expense Categories" delay={1} />
                        <StatItem value="AI" label="Smart Categorization" delay={2} />
                        <StatItem value="24/7" label="Telegram Bot Access" delay={3} />
                    </div>
                </section>

                {/* ── Features Section ────────────────────────────────────── */}
                <section id="features" className="container mx-auto max-w-6xl px-4 py-14 sm:py-16 md:py-24">
                    <FadeUpSection className="mb-12 text-center">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            Everything You Need
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                            Powerful features to take control of your finances
                        </p>
                    </FadeUpSection>

                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                        {features.map((f, i) => (
                            <FeatureCard key={f.title} {...f} delay={i} />
                        ))}
                    </div>
                </section>

                {/* ── How It Works ────────────────────────────────────────── */}
                <section className="border-y bg-muted/20">
                    <div className="container mx-auto max-w-6xl px-4 py-14 sm:py-16 md:py-24">
                        <FadeUpSection className="mb-12 text-center">
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How It Works</h2>
                            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                                Start tracking in under a minute
                            </p>
                        </FadeUpSection>

                        <div className="grid gap-12 md:grid-cols-3">
                            {/* Connector lines (decorative, hidden on mobile) */}
                            <StepItem number="1" icon={IconShieldLock} title="Sign Up" description="Create your account in seconds. Set your monthly budget and preferred currency." delay={0} />
                            <StepItem number="2" icon={IconMessagePlus} title="Add Expenses" description="Log expenses via the web dashboard or send a quick message to our Telegram bot. AI handles the rest." delay={1} />
                            <StepItem number="3" icon={IconLayoutDashboard} title="Get Insights" description="View spending breakdowns, track budgets, and discover patterns with beautiful charts and analytics." delay={2} />
                        </div>
                    </div>
                </section>

                {/* ── Dashboard Preview ───────────────────────────────────── */}
                <section className="container mx-auto max-w-6xl px-4 py-14 sm:py-16 md:py-24">
                    <FadeUpSection className="mb-12 text-center">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            Your Finances at a Glance
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                            A beautiful, real-time dashboard that shows you exactly where your money goes
                        </p>
                    </FadeUpSection>

                    <FadeUpSection delay={0.1}>
                        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-2xl">
                            {/* Mock browser bar */}
                            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                                <div className="flex gap-1.5">
                                    <div className="h-3 w-3 rounded-full bg-red-400" />
                                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                                    <div className="h-3 w-3 rounded-full bg-green-400" />
                                </div>
                                <div className="mx-auto h-6 w-48 rounded-full bg-muted border" />
                            </div>

                            {/* Mock dashboard content */}
                            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-6">
                                {[
                                    { label: "Total Spent", value: "₹28,450", color: "text-foreground", bg: "bg-primary/5", delay: 0.2 },
                                    { label: "Budget Left", value: "₹11,550", color: "text-green-500", bg: "bg-green-500/5", delay: 0.3 },
                                    { label: "Transactions", value: "47", color: "text-blue-500", bg: "bg-blue-500/5", delay: 0.4 },
                                    { label: "Top Category", value: "Food", color: "text-orange-500", bg: "bg-orange-500/5", delay: 0.5 },
                                ].map((card) => (
                                    <motion.div
                                        key={card.label}
                                        className={`rounded-xl border ${card.bg} p-3 sm:p-4`}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: card.delay, duration: 0.5 }}
                                    >
                                        <p className="text-xs text-muted-foreground">{card.label}</p>
                                        <p className={`mt-1 text-lg font-bold sm:text-xl ${card.color}`}>{card.value}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Mock bar chart */}
                            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                                <p className="mb-3 text-xs font-medium text-muted-foreground">Monthly Spending Trend</p>
                                <div className="flex items-end gap-2 h-24">
                                    {[35, 55, 40, 70, 60, 85, 72].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            className="flex-1 rounded-t-md bg-primary/80"
                                            initial={{ scaleY: 0, originY: 1 }}
                                            whileInView={{ scaleY: 1 }}
                                            viewport={{ once: true }}
                                            style={{ height: `${h}%` }}
                                            transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: "easeOut" }}
                                        />
                                    ))}
                                </div>
                                <div className="mt-2 flex gap-2">
                                    {["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"].map((m) => (
                                        <p key={m} className="flex-1 text-center text-xs text-muted-foreground">{m}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </FadeUpSection>
                </section>

                {/* ── Comparison Section ──────────────────────────────────── */}
                <section className="border-y bg-muted/20">
                    <div className="container mx-auto max-w-6xl px-4 py-14 sm:py-16 md:py-24">
                        <FadeUpSection className="mb-12 text-center">
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Why Chamber?
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                                See how Chamber stacks up against traditional methods
                            </p>
                        </FadeUpSection>

                        <FadeUpSection delay={0.1}>
                            <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border">
                                <div className="grid grid-cols-3 border-b bg-muted/30 px-4 py-3 text-sm font-semibold">
                                    <span>Feature</span>
                                    <span className="text-center">📒 Spreadsheet</span>
                                    <span className="text-center text-primary">⚡ Chamber</span>
                                </div>
                                {[
                                    ["AI Categorization", false, true],
                                    ["Telegram Input", false, true],
                                    ["Receipt Scanning", false, true],
                                    ["Budget Alerts", false, true],
                                    ["Analytics & Charts", "Manual", true],
                                    ["Multi-Account", false, true],
                                    ["Subscription Tracking", false, true],
                                    ["Free & Open Source", "Sometimes", true],
                                ].map(([label, spreadsheet, chamber], i) => (
                                    <motion.div
                                        key={label as string}
                                        className={`grid grid-cols-3 items-center px-4 py-3 text-sm ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.05, duration: 0.4 }}
                                    >
                                        <span className="font-medium">{label as string}</span>
                                        <span className="text-center">
                                            {spreadsheet === false ? (
                                                <span className="text-red-500">✗</span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">{spreadsheet as string}</span>
                                            )}
                                        </span>
                                        <span className="text-center text-green-500 font-medium">✓</span>
                                    </motion.div>
                                ))}
                            </div>
                        </FadeUpSection>
                    </div>
                </section>

                {/* ── Privacy & Open Source ───────────────────────────────── */}
                <section className="container mx-auto max-w-6xl px-4 py-14 sm:py-16 md:py-24">
                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            {
                                emoji: "🔒",
                                title: "Privacy First",
                                body: "Your financial data never leaves your control. Chamber is self-hostable — run it on your own server if you want full ownership.",
                                delay: 0,
                                accent: "border-blue-500/20 bg-blue-500/5",
                            },
                            {
                                emoji: "⚡",
                                title: "Open Source",
                                body: "Every line of code is on GitHub. No black boxes, no hidden fees. Fork it, extend it, make it yours.",
                                delay: 0.1,
                                accent: "border-green-500/20 bg-green-500/5",
                            },
                            {
                                emoji: "🚀",
                                title: "Always Free",
                                body: "Core features are free forever. No trial periods, no credit card required, no surprise paywalls.",
                                delay: 0.2,
                                accent: "border-purple-500/20 bg-purple-500/5",
                            },
                        ].map((item) => (
                            <motion.div
                                key={item.title}
                                className={`rounded-2xl border p-6 sm:p-8 ${item.accent}`}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: item.delay, duration: 0.5 }}
                                whileHover={{ y: -4 }}
                            >
                                <motion.span
                                    className="mb-4 block text-4xl"
                                    animate={{ rotate: [0, 8, -5, 8, 0] }}
                                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, delay: item.delay * 2 }}
                                >
                                    {item.emoji}
                                </motion.span>
                                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── FAQ Section ─────────────────────────────────────────── */}
                <section className="border-t bg-muted/10">
                    <div className="container mx-auto max-w-6xl px-4 py-14 sm:py-16 md:py-24">
                        <FadeUpSection className="mb-12 text-center">
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Frequently Asked Questions</h2>
                            <p className="mt-2 text-sm text-muted-foreground sm:text-base">Everything you need to know about Chamber</p>
                        </FadeUpSection>

                        <div className="mx-auto max-w-2xl space-y-3">
                            {[
                                {
                                    q: "Is Chamber really free?",
                                    a: "Yes — completely free and open source. No credit card required. Core features will always be free.",
                                },
                                {
                                    q: "How does the Telegram bot work?",
                                    a: "Link your Telegram account in Settings, then message the bot anything like \"Coffee 80\" or send a photo of your receipt. AI does the rest — categorizes, logs the amount, and confirms with you.",
                                },
                                {
                                    q: "Is my financial data secure?",
                                    a: "Yes. Data is stored securely and never shared with third parties. The app is open source so you can inspect every line. You can also self-host it entirely.",
                                },
                                {
                                    q: "Can I import from my bank?",
                                    a: "Yes — Chamber supports CSV import from most Indian banks. Upload your bank statement and it parses and categorizes transactions automatically.",
                                },
                                {
                                    q: "Does it work without Telegram?",
                                    a: "Absolutely. You can use the full web dashboard to add, edit, and manage expenses without ever touching the Telegram bot.",
                                },
                                {
                                    q: "Can I track shared expenses or money I lent?",
                                    a: "Yes — the Loans section lets you log money you've lent, set due dates, track repayments, and even attach receipt photos.",
                                },
                            ].map((item, i) => (
                                <FAQItem key={i} question={item.q} answer={item.a} delay={i * 0.05} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA Section ─────────────────────────────────────────── */}
                <section className="relative container mx-auto max-w-6xl overflow-hidden px-4">
                    <div className="pointer-events-none absolute inset-0" aria-hidden>
                        <motion.div
                            className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </div>
                    <FadeUpSection>
                        <div className="relative flex flex-col items-center justify-center py-16 text-center sm:py-20 md:py-28">
                            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                                Ready to Take Control of Your Finances?
                            </h2>
                            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-base">
                                Join Chamber and start tracking your expenses smarter, not harder.
                                It&apos;s free, open-source, and privacy-first.
                            </p>
                            <motion.div
                                className="mt-8"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                viewport={{ once: true }}
                            >
                                <Link href="/dashboard">
                                    <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>
                                        <Button size="lg" className="rounded-md px-10 shadow-lg shadow-primary/30">
                                            Start Tracking Now
                                            <motion.span
                                                animate={{ x: [0, 5, 0] }}
                                                transition={{ duration: 1.2, repeat: Infinity }}
                                            >
                                                <IconArrowRight className="ml-1 h-4 w-4" />
                                            </motion.span>
                                        </Button>
                                    </motion.div>
                                </Link>
                            </motion.div>
                        </div>
                    </FadeUpSection>
                </section>

                {/* ── Footer ──────────────────────────────────────────────── */}
                <footer className="border-t">
                    <div className="container mx-auto flex flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:justify-between sm:py-8">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                                C
                            </div>
                            <span className="text-sm font-medium">Chamber</span>
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                            Built by Sukhendu &middot;{" "}
                            <Link
                                href="https://github.com/Sukhendu2002/Chamber"
                                target="_blank"
                                className="hover:text-primary transition-colors"
                            >
                                GitHub
                            </Link>
                        </p>
                    </div>
                </footer>
            </main>
        </div>
    );
}

