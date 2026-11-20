import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
  CheckCircle2, ArrowRight, ShieldCheck, Zap, TrendingUp, 
  Users, Building2, FileSpreadsheet, Lock, Clock, Check,
  ChevronRight, PhoneCall, Sparkles, Send, ShieldAlert, Cpu,
  Laptop, Briefcase
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);
  const [manualPhase, setManualPhase] = useState(null);
  const [statsAnimated, setStatsAnimated] = useState(false);
  const [headcount, setHeadcount] = useState(100);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const stageRef = useRef(null);
  const statsRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    team_size: '51-200',
    service_interest: 'SOFTWARE_LICENSE',
    notes: '',
  });

  // ── Scroll Tracking & Sticky Stage Calculations ───────────────────────────
  useEffect(() => {
    let ticking = false;

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.pageYOffset || document.documentElement.scrollTop;
          setScrollY(currentY);

          // Full Page Progress
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const totalProgress = docHeight > 0 ? (currentY / docHeight) * 100 : 0;
          setScrollProgress(Math.min(100, Math.max(0, totalProgress)));

          // Pinned 3-Phase Stage Progress
          if (stageRef.current) {
            const rect = stageRef.current.getBoundingClientRect();
            const stageHeight = rect.height - window.innerHeight;
            if (stageHeight > 0) {
              const currentOffset = -rect.top;
              const progress = Math.max(0, Math.min(1, currentOffset / stageHeight));
              setStageProgress(progress);
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── IntersectionObserver for Smooth In-View Element Reveals ───────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (entry.target.id === 'stats-section') {
              setStatsAnimated(true);
            }
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Compute active stage phase (0, 1, or 2)
  const currentPhase = manualPhase !== null 
    ? manualPhase 
    : stageProgress < 0.35 
      ? 0 
      : stageProgress < 0.70 
        ? 1 
        : 2;

  // ── Animated Stats Counter Hook ───────────────────────────────────────────
  const [accuracyCount, setAccuracyCount] = useState(0);
  const [timeCount, setTimeCount] = useState(15);
  useEffect(() => {
    if (!statsAnimated) return;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    function updateCounter(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setAccuracyCount(Number((ease * 99.9).toFixed(1)));
      setTimeCount(Math.max(2, Math.round(15 - ease * 13)));

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    }
    requestAnimationFrame(updateCounter);
  }, [statsAnimated]);

  // Lead Submission
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/leads', { ...form, notes: `[Model: ${form.service_interest}] ${form.notes || ''}`.trim() });
      toast.success('Inquiry received! We will call you within 15 minutes.');
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  }

  // Headcount impact calculations
  const totalMonthlyPayroll = headcount * 65000;
  const epfEsicHandled = Math.round(totalMonthlyPayroll * 0.1275);
  const hoursSaved = Math.round(headcount * 0.4);

  // Parallax calculations
  const heroTilt = Math.max(0, 8 - scrollY * 0.02);
  const heroScale = Math.min(1.02, 0.96 + scrollY * 0.00015);
  const heroTextParallax = Math.min(50, scrollY * 0.12);
  const heroBadgeLeft = Math.min(40, scrollY * 0.22);
  const heroBadgeRight = Math.min(50, scrollY * 0.28);

  return (
    <div style={{ backgroundColor: '#FFFFFF', color: '#0F172A', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowX: 'hidden' }}>
      
      {/* ── Top Continuous Scroll Progress Bar ─────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 3,
          backgroundColor: '#10B981',
          width: `${scrollProgress}%`,
          zIndex: 9999,
          boxShadow: '0 0 10px rgba(16, 185, 129, 0.7)',
          transition: 'width 0.08s ease-out',
        }}
      />

      {/* ── Sticky Top Navigation ──────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: scrollY > 20 ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: scrollY > 20 ? '1px solid #E2E8F0' : '1px solid transparent',
          transition: 'all 0.25s ease',
          height: 76,
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: '#023326',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                fontWeight: 900,
                fontSize: 18,
                boxShadow: '0 4px 12px rgba(2, 51, 38, 0.2)',
              }}
            >
              P
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                Ploy.pe
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, backgroundColor: '#E6F4EA', color: '#023326', fontWeight: 800 }}>
                  HR & PAYROLL
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, letterSpacing: '0.04em' }}>
                by NH Associates
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 13.5, fontWeight: 600, color: '#475569' }}>
            <a href="#usp" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}>Our USP (2 Models)</a>
            <a href="#engine" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}>Automated Engine</a>
            <a href="#stats" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}>Compliance Metrics</a>
            <a href="#calculator" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}>Impact Calculator</a>
            <a href="#contact" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}>Contact</a>
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  backgroundColor: '#023326',
                  color: '#FFFFFF',
                  borderRadius: 9999,
                  fontSize: 13.5,
                  fontWeight: 800,
                  padding: '9px 18px',
                  border: '1px solid #10B981',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(2, 51, 38, 0.2)',
                }}
              >
                <span>Dashboard ({user.name?.split(' ')[0] || 'User'})</span>
                <ArrowRight size={14} color="#10B981" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#334155',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '8px 14px',
                }}
              >
                Client Login
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              style={{
                backgroundColor: '#023326',
                color: '#FFFFFF',
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 700,
                padding: '10px 20px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(2, 51, 38, 0.25)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <PhoneCall size={14} color="#10B981" />
              Request Callback
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION: 3D Dimensional Parallax ──────────────────── */}
      <section style={{ position: 'relative', paddingTop: 64, paddingBottom: 96, overflow: 'hidden' }}>
        
        {/* Ambient Subtle Glow */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          
          {/* Hero Header Content (Parallax Floating) */}
          <div style={{ transform: `translateY(${heroTextParallax}px)`, transition: 'transform 0.1s linear' }}>
            
            {/* Top Badge */}
            <div
              className="scroll-animate is-visible"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 9999,
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#065F46',
                fontSize: 12.5,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              <Sparkles size={14} color="#10B981" />
              Next-Gen Multi-Client Payroll OS for Enterprises & CA Firms
            </div>

            {/* Main Headline */}
            <h1
              className="scroll-animate is-visible"
              style={{
                fontSize: 'clamp(36px, 5.2vw, 68px)',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1.08,
                color: '#0F172A',
                maxWidth: 960,
                margin: '0 auto 24px auto',
              }}
            >
              Enterprise Payroll, CTC Architecture & Direct Disbursal on{' '}
              <span style={{ color: '#023326', textDecoration: 'underline', textDecorationColor: '#10B981', textUnderlineOffset: 6 }}>
                Autopilot.
              </span>
            </h1>

            {/* Subheading */}
            <p
              className="scroll-animate is-visible scroll-animate-delay-1"
              style={{
                fontSize: 18,
                color: '#475569',
                maxWidth: 720,
                margin: '0 auto 36px auto',
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              Eliminate manual Excel sheets, compliance penalties, and banking friction. 
              Ploy.pe calculates statutory deductions (PF, ESI, PT, TDS) for thousands of employees 
              and executes bank payouts in minutes.
            </p>

            {/* Primary CTA Buttons */}
            <div
              className="scroll-animate is-visible scroll-animate-delay-2"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 56 }}
            >
              <button
                onClick={() => {
                  const target = document.getElementById('contact');
                  target?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  backgroundColor: '#023326',
                  color: '#FFFFFF',
                  borderRadius: 9999,
                  fontSize: 15,
                  fontWeight: 800,
                  padding: '14px 28px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 10px 25px rgba(2, 51, 38, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                Schedule Direct Walkthrough
                <ArrowRight size={16} color="#10B981" />
              </button>

              <button
                onClick={() => {
                  const target = document.getElementById('engine');
                  target?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  borderRadius: 9999,
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '14px 24px',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                See Scroll Interactive Demo ↓
              </button>
            </div>
          </div>

          {/* Floating Live Parallax Pills */}
          <div
            style={{
              position: 'absolute',
              top: 260,
              left: 40,
              transform: `translateY(${heroBadgeLeft}px)`,
              transition: 'transform 0.1s linear',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 18px',
              borderRadius: 9999,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.08)',
              border: '1px solid #E2E8F0',
              zIndex: 3,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>100% Statutory Compliant</span>
          </div>

          <div
            style={{
              position: 'absolute',
              top: 320,
              right: 40,
              transform: `translateY(${heroBadgeRight}px)`,
              transition: 'transform 0.1s linear',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 18px',
              borderRadius: 9999,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.08)',
              border: '1px solid #E2E8F0',
              zIndex: 3,
            }}
          >
            <ShieldCheck size={16} color="#10B981" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>ICICI / HDFC API Linked</span>
          </div>

          {/* 3D Dynamic Perspective Card (Straightens & Scales on Scroll) */}
          <div
            style={{
              maxWidth: 1080,
              margin: '0 auto',
              perspective: 1200,
            }}
          >
            <div
              style={{
                transform: `rotateX(${heroTilt}deg) scale(${heroScale})`,
                transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                borderRadius: 20,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.04)',
                overflow: 'hidden',
                textAlign: 'left',
              }}
            >
              {/* Mock App Window Top Bar */}
              <div
                style={{
                  height: 48,
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 12, fontWeight: 500 }}>
                    app.ploy.pe/admin/payroll/run-november
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', backgroundColor: '#D1FAE5', padding: '3px 8px', borderRadius: 6 }}>
                    ● LIVE RUN ACTIVE
                  </span>
                </div>
              </div>

              {/* Mock App Body Content */}
              <div style={{ padding: '32px 36px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Client Entity: Apex Global Technologies Ltd.
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
                      November 2026 Scheduled Disbursal
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ padding: '10px 18px', backgroundColor: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Total Headcount</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>428 Staff</div>
                    </div>
                    <div style={{ padding: '10px 18px', backgroundColor: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: 11, color: '#047857' }}>Disbursal Sum</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#047857' }}>₹ 2,84,50,000</div>
                    </div>
                  </div>
                </div>

                {/* Live Computed Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <div style={{ padding: 16, borderLeft: '3px solid #10B981', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>EPF DEPOSIT (12%)</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>₹ 18,40,200</div>
                    <div style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>✓ ECR File Auto-Generated</div>
                  </div>

                  <div style={{ padding: 16, borderLeft: '3px solid #3B82F6', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>ESIC CONTRIBUTION</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>₹ 2,14,350</div>
                    <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 2 }}>✓ Monthly Challan Ready</div>
                  </div>

                  <div style={{ padding: 16, borderLeft: '3px solid #F59E0B', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>TDS TAX DEDUCTION</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>₹ 24,90,100</div>
                    <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 2 }}>✓ Form 16 / 24Q Ready</div>
                  </div>

                  <div style={{ padding: 16, borderLeft: '3px solid #023326', backgroundColor: '#F8FAFC' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>DIRECT BANK BATCH</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>428 / 428 Paid</div>
                    <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>✓ RTGS Batch Cleared</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 16, fontSize: 12, color: '#64748B' }}>
                  <span>Encrypted Payslips automatically dispatched to employees via WhatsApp & Email</span>
                  <span style={{ fontWeight: 700, color: '#023326' }}>Audit Log Reference: #PL-2026-1184</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── CLIENT TRUST BANNER (Unboxed) ──────────────────────────── */}
      <section style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '36px 24px', backgroundColor: '#FAFAFA' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 20 }}>
            Trusted by fast-growing startups, manufacturing giants, and chartered accountancy firms across India
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 48, flexWrap: 'wrap', opacity: 0.75 }}>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', color: '#334155' }}>NH & ASSOCIATES</span>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#334155' }}>VANGUARD TECH</span>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#334155' }}>STRATA LOGISTICS</span>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#334155' }}>ORION CAPITAL</span>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: '#334155' }}>KAPITAL FINCORP</span>
          </div>
        </div>
      </section>

      {/* ── OUR CORE USP: DUAL MODEL (SOFTWARE OR MANAGED CA) ────────── */}
      <section id="usp" style={{ padding: '96px 24px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #F1F5F9' }}>
        <div className="scroll-animate" style={{ maxWidth: 1240, margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', maxWidth: 880, margin: '0 auto 64px auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              <Sparkles size={14} />
              THE PLOY.PE DUAL-MODEL ADVANTAGE
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4.4vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.12, color: '#0F172A', marginBottom: 18 }}>
              We run your payroll, or empower you to run it yourself. <br />
              <span style={{ color: '#023326', textDecoration: 'underline', textDecorationColor: '#10B981', textUnderlineOffset: 6 }}>
                That’s our core USP.
              </span>
            </h2>
            <p style={{ fontSize: 17, color: '#64748B', lineHeight: 1.6, fontWeight: 500 }}>
              Pure software vendors won’t touch your statutory filings. Traditional CA firms drown you in manual spreadsheets. 
              <strong> NH Associates bridges both worlds:</strong> use our enterprise software in-house, or let our veteran CAs handle everything for you.
            </p>
          </div>

          {/* 2-Track Comparative Grid (Unboxed, High Craft) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 36, marginBottom: 48 }}>
            
            {/* Track 1: Software License (Self-Serve) */}
            <div
              style={{
                borderLeft: '4px solid #10B981',
                padding: '36px 32px',
                backgroundColor: '#F8FAFC',
                borderRadius: '0 16px 16px 0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 9999, backgroundColor: '#D1FAE5', color: '#065F46', letterSpacing: '0.05em' }}>
                    TRACK A · SELF-MANAGED SAAS
                  </span>
                  <Laptop size={22} color="#10B981" />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginBottom: 12 }}>
                  Buy Ploy.pe Software License
                </h3>
                <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
                  Empower your internal HR, People Ops, and Finance teams with the modern Ploy.pe platform. Run enterprise multi-tier payroll and CTC structures completely in-house with zero touch.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {[
                    'Full Cloud SaaS Access with Role-Based Access Control',
                    'Automated Indian Statutory Engine (EPF, ESIC, PT, TDS)',
                    'Instant WhatsApp & Password-Encrypted PDF Payslips',
                    'Direct Corporate Bank Integration (ICICI, HDFC, Axis, SBI)',
                    'Multi-Entity & Unlimited Department Hierarchy Support',
                  ].map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#334155' }}>
                      <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>BEST SUITED FOR:</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', marginTop: 4 }}>
                    Companies with an existing HR/payroll team wanting 10x faster automation.
                  </div>
                </div>

                <button
                  onClick={() => {
                    setForm(prev => ({ ...prev, service_interest: 'SOFTWARE_LICENSE' }));
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 10,
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #023326',
                    color: '#023326',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#023326';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#023326';
                  }}
                >
                  Deploy Software In-House
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Track 2: Fully Managed Payroll Outsourcing */}
            <div
              style={{
                borderLeft: '4px solid #023326',
                padding: '36px 32px',
                backgroundColor: '#F0FDF4',
                borderRadius: '0 16px 16px 0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 9999, backgroundColor: '#023326', color: '#A7F3D0', letterSpacing: '0.05em' }}>
                    TRACK B · MANAGED CA OUTSOURCING
                  </span>
                  <Briefcase size={22} color="#023326" />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', marginBottom: 12 }}>
                  Full Managed Payroll Outsourcing
                </h3>
                <p style={{ fontSize: 14.5, color: '#334155', lineHeight: 1.6, marginBottom: 24 }}>
                  Outsource your complete payroll function to NH Associates. Our seasoned Chartered Accountants calculate, disburse, and file all statutory returns with 100% legal indemnity.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {[
                    'End-to-End Execution by Dedicated NH Associates CA Specialists',
                    'Monthly EPFO ECR, ESIC, PT, and 24Q TDS Returns Filed For You',
                    'Direct Salary Disbursal Execution & Employee Tax Helpdesk',
                    'Annual Form 16 Generation & Full Statutory Audit Representation',
                    'Live Executive Client Dashboard to review and approve in real time',
                  ].map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: '#166534' }}>
                      <CheckCircle2 size={16} color="#15803D" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ borderTop: '1px solid #BBF7D0', paddingTop: 20, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>BEST SUITED FOR:</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#064E3B', marginTop: 4 }}>
                    Startups & enterprises wanting zero payroll headaches and zero penalty risks.
                  </div>
                </div>

                <button
                  onClick={() => {
                    setForm(prev => ({ ...prev, service_interest: 'MANAGED_OUTSOURCING' }));
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 10,
                    backgroundColor: '#023326',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 6px 18px rgba(2, 51, 38, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Outsource to NH Associates
                  <ArrowRight size={15} color="#10B981" />
                </button>
              </div>
            </div>

          </div>

          {/* The Hybrid Bridge Callout */}
          <div
            style={{
              padding: '24px 32px',
              borderRadius: 14,
              border: '1px dashed #CBD5E1',
              backgroundColor: '#FAFAFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#E6F4EA', color: '#023326', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>
                ⇄
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                  The Hybrid Guarantee: Start Managed, Migrate In-House Whenever You Want.
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  Many clients have our CAs run payroll while growing, then switch to running Ploy.pe in-house seamlessly without data migration.
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setForm(prev => ({ ...prev, service_interest: 'HYBRID' }));
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#023326',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                textDecoration: 'underline',
              }}
            >
              Discuss Custom Hybrid Setup →
            </button>
          </div>

        </div>
      </section>

      {/* ── PINNED 3-PHASE STAGE (The Engineered Peak) ──────────────── */}
      {/* Container height is 240vh to create the scroll runway */}
      <section
        id="engine"
        ref={stageRef}
        style={{
          position: 'relative',
          height: '240vh',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Sticky Viewport Container */}
        <div
          style={{
            position: 'sticky',
            top: 76,
            height: 'calc(100vh - 76px)',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px', width: '100%' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 440px) 1fr', gap: 60, alignItems: 'center' }}>
              
              {/* Left Column: Timeline Navigation */}
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  <Cpu size={14} />
                  The Ploy.pe Automation Engine
                </div>
                <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, color: '#0F172A', marginBottom: 16 }}>
                  Scroll through the 3 phases of effortless payroll.
                </h2>
                <p style={{ fontSize: 14.5, color: '#64748B', lineHeight: 1.6, marginBottom: 36 }}>
                  Watch how Ploy.pe transforms hours of stressful spreadsheet cross-checking into an instant, error-free workflow.
                </p>

                {/* 3 Step Indicators */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
                  
                  {/* Vertical Progress Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 17,
                      top: 10,
                      bottom: 10,
                      width: 2,
                      backgroundColor: '#E2E8F0',
                      zIndex: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${stageProgress * 100}%`,
                        backgroundColor: '#10B981',
                        transition: 'height 0.1s linear',
                      }}
                    />
                  </div>

                  {/* Step 1 */}
                  <div
                    onClick={() => setManualPhase(0)}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      gap: 16,
                      cursor: 'pointer',
                      padding: '12px 16px',
                      borderRadius: 12,
                      backgroundColor: currentPhase === 0 ? '#F0FDF4' : 'transparent',
                      borderLeft: currentPhase === 0 ? '3px solid #10B981' : '3px solid transparent',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        backgroundColor: currentPhase === 0 ? '#023326' : '#FFFFFF',
                        border: currentPhase === 0 ? '2px solid #10B981' : '2px solid #CBD5E1',
                        color: currentPhase === 0 ? '#10B981' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      01
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: currentPhase === 0 ? '#0F172A' : '#64748B' }}>
                        Universal Employee Onboarding
                      </div>
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                        Instant Excel / HRMS sync. Auto-validates PAN, Aadhaar, Bank IFSC, and UAN before execution.
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div
                    onClick={() => setManualPhase(1)}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      gap: 16,
                      cursor: 'pointer',
                      padding: '12px 16px',
                      borderRadius: 12,
                      backgroundColor: currentPhase === 1 ? '#F0FDF4' : 'transparent',
                      borderLeft: currentPhase === 1 ? '3px solid #10B981' : '3px solid transparent',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        backgroundColor: currentPhase === 1 ? '#023326' : '#FFFFFF',
                        border: currentPhase === 1 ? '2px solid #10B981' : '2px solid #CBD5E1',
                        color: currentPhase === 1 ? '#10B981' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      02
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: currentPhase === 1 ? '#0F172A' : '#64748B' }}>
                        Zero-Touch Statutory Computation
                      </div>
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                        EPF, ESIC, Professional Tax, and Section 115BAC New Regime TDS evaluated instantaneously.
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div
                    onClick={() => setManualPhase(2)}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      gap: 16,
                      cursor: 'pointer',
                      padding: '12px 16px',
                      borderRadius: 12,
                      backgroundColor: currentPhase === 2 ? '#F0FDF4' : 'transparent',
                      borderLeft: currentPhase === 2 ? '3px solid #10B981' : '3px solid transparent',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        backgroundColor: currentPhase === 2 ? '#023326' : '#FFFFFF',
                        border: currentPhase === 2 ? '2px solid #10B981' : '2px solid #CBD5E1',
                        color: currentPhase === 2 ? '#10B981' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      03
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: currentPhase === 2 ? '#0F172A' : '#64748B' }}>
                        Direct Bank Disbursals & Compliance
                      </div>
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                        1-Click direct payout via corporate banking APIs. Auto-delivers WhatsApp slips & EPFO challans.
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column: Morphing Interactive Screen */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.1)',
                  padding: '32px 36px',
                  minHeight: 460,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Stage Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                      {currentPhase === 0 && 'PHASE 01: Employee Ingestion & KYC Validation'}
                      {currentPhase === 1 && 'PHASE 02: Real-time Statutory Computation Engine'}
                      {currentPhase === 2 && 'PHASE 03: Direct Bank Batch & Government Filing'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 9999, backgroundColor: '#F0FDF4', color: '#047857' }}>
                    AUTOPILOT READY
                  </span>
                </div>

                {/* Morphing Stage Body */}
                <div style={{ margin: '24px 0', flex: 1 }}>
                  
                  {/* Phase 0 Content */}
                  {currentPhase === 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
                        Bulk ingest rosters via CSV, Excel, or HRMS webhook with instant data health check:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { name: 'Rahul Sharma', role: 'Staff Software Eng', bank: 'HDFC Bank · IFSC HDFC000123', status: 'VERIFIED' },
                          { name: 'Priya Nair', role: 'Product Lead', bank: 'ICICI Bank · IFSC ICIC000456', status: 'VERIFIED' },
                          { name: 'Amit Verma', role: 'Operations Exec', bank: 'Axis Bank · IFSC UTIB000789', status: 'VERIFIED' },
                          { name: 'Sneha Reddy', role: 'Account Director', bank: 'SBI · IFSC SBIN000321', status: 'VERIFIED' },
                        ].map((emp, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              backgroundColor: '#F8FAFC',
                              borderRadius: 8,
                              borderLeft: '3px solid #10B981',
                              fontSize: 13,
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>{emp.name}</span>
                              <span style={{ color: '#64748B', marginLeft: 8 }}>({emp.role})</span>
                              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{emp.bank}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#059669', backgroundColor: '#D1FAE5', padding: '3px 8px', borderRadius: 6 }}>
                              ✓ {emp.status}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#059669' }}>
                        <CheckCircle2 size={16} />
                        100% Validated: 0 Missing PANs · 0 IFSC Mismatches
                      </div>
                    </div>
                  )}

                  {/* Phase 1 Content */}
                  {currentPhase === 1 && (
                    <div>
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
                        Mathematical statutory engine computes deductions according to Indian labor laws:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ padding: 14, backgroundColor: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: 11, color: '#64748B' }}>Gross Salary Pool</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>₹ 48,50,000</div>
                          <div style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>Basic (50%) + HRA + Special</div>
                        </div>

                        <div style={{ padding: 14, backgroundColor: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: 11, color: '#047857' }}>EPF Deduction (12%)</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#047857', marginTop: 4 }}>₹ 3,49,200</div>
                          <div style={{ fontSize: 11, color: '#047857', marginTop: 4 }}>Capped wage ceiling verified</div>
                        </div>

                        <div style={{ padding: 14, backgroundColor: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE' }}>
                          <div style={{ fontSize: 11, color: '#1D4ED8' }}>ESIC Contribution</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#1D4ED8', marginTop: 4 }}>₹ 38,400</div>
                          <div style={{ fontSize: 11, color: '#1D4ED8', marginTop: 4 }}>Wage limit &lt; ₹21,000 threshold</div>
                        </div>

                        <div style={{ padding: 14, backgroundColor: '#FEF3C7', borderRadius: 10, border: '1px solid #FDE68A' }}>
                          <div style={{ fontSize: 11, color: '#B45309' }}>TDS Auto-Regime</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#B45309', marginTop: 4 }}>₹ 4,12,000</div>
                          <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>Sec 115BAC vs Old Regime check</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 18, padding: 12, backgroundColor: '#023326', color: '#A7F3D0', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>⚡ Computation Engine Speed: 1,240 records processed in 1.4 seconds</span>
                        <span style={{ fontWeight: 800, color: '#FFFFFF' }}>0 ERRORS</span>
                      </div>
                    </div>
                  )}

                  {/* Phase 2 Content */}
                  {currentPhase === 2 && (
                    <div>
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
                        Direct bank disbursement and instant automated compliance returns:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#023326', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                              ₹
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>Bank Disbursal Batch #8812</div>
                              <div style={{ fontSize: 11, color: '#047857' }}>Net Payable: ₹40,50,400 via ICICI API</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#047857', backgroundColor: '#D1FAE5', padding: '4px 10px', borderRadius: 6 }}>
                            DISBURSED TO ALL
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>WhatsApp & Email Slips</div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Delivered to 100% staff phone & inbox</div>
                          </div>
                          <div style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>EPFO ECR & ESIC Challan</div>
                            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Auto-formatted text files ready for upload</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 20, textAlign: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#023326', backgroundColor: '#E6F4EA', padding: '6px 14px', borderRadius: 9999 }}>
                          Cycle Complete in 3 Mins · Next Month Ready
                        </span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Stage Footer Progress */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: '#64748B' }}>
                    {currentPhase === 0 && 'Phase 1 of 3: Roster Ingestion'}
                    {currentPhase === 1 && 'Phase 2 of 3: Computation & Tax'}
                    {currentPhase === 2 && 'Phase 3 of 3: Bank Disbursal'}
                  </span>
                  <span style={{ fontWeight: 800, color: '#10B981' }}>
                    {Math.round(stageProgress * 100)}% Through Workflow
                  </span>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── STATS & COMPLIANCE METRICS (Reveals on Scroll) ─────────── */}
      <section
        id="stats"
        ref={statsRef}
        style={{ padding: '96px 24px', backgroundColor: '#023326', color: '#FFFFFF' }}
      >
        <div id="stats-section" className="scroll-animate" style={{ maxWidth: 1240, margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, marginBottom: 64 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                PROVEN STATISTICAL PERFORMANCE
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
                Engineered for 100% audit readiness.
              </h2>
            </div>
            <p style={{ maxWidth: 440, fontSize: 14.5, color: '#A7F3D0', lineHeight: 1.6 }}>
              Whether you are managing 50 employees across 1 client, or 10,000 employees across 40 corporate entities, Ploy.pe enforces zero mathematical tolerance.
            </p>
          </div>

          {/* Numbers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            
            <div style={{ borderLeft: '2px solid #10B981', paddingLeft: 20 }}>
              <div style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
                {accuracyCount}%
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#A7F3D0', marginTop: 6 }}>
                Statutory Accuracy Rate
              </div>
              <p style={{ fontSize: 13, color: '#6EE7B7', marginTop: 6, lineHeight: 1.5 }}>
                Zero miscalculations in EPF, ESIC, PT slabs, and income tax regimes across all states.
              </p>
            </div>

            <div style={{ borderLeft: '2px solid #10B981', paddingLeft: 20 }}>
              <div style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
                &lt; {timeCount} Mins
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#A7F3D0', marginTop: 6 }}>
                Average Monthly Run Time
              </div>
              <p style={{ fontSize: 13, color: '#6EE7B7', marginTop: 6, lineHeight: 1.5 }}>
                From roster upload to final payslip generation and banking payout confirmation.
              </p>
            </div>

            <div style={{ borderLeft: '2px solid #10B981', paddingLeft: 20 }}>
              <div style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
                100%
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#A7F3D0', marginTop: 6 }}>
                Bank Gateway Compatibility
              </div>
              <p style={{ fontSize: 13, color: '#6EE7B7', marginTop: 6, lineHeight: 1.5 }}>
                Instant salary disbursement file generation for HDFC, ICICI, SBI, Axis, and Kotak.
              </p>
            </div>

            <div style={{ borderLeft: '2px solid #10B981', paddingLeft: 20 }}>
              <div style={{ fontSize: 'clamp(38px, 4.5vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
                0
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#A7F3D0', marginTop: 6 }}>
                Compliance Penalties
              </div>
              <p style={{ fontSize: 13, color: '#6EE7B7', marginTop: 6, lineHeight: 1.5 }}>
                Guaranteed deadline alerts, pre-formatted challans, and real-time labor law updates.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── INTERACTIVE IMPACT CALCULATOR (Signature Move) ─────────── */}
      <section id="calculator" style={{ padding: '96px 24px', backgroundColor: '#FFFFFF' }}>
        <div className="scroll-animate" style={{ maxWidth: 1040, margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              <Sparkles size={14} />
              Interactive Capacity Estimator
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 42px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#0F172A' }}>
              See what Ploy.pe automates for your organization.
            </h2>
            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 600, margin: '12px auto 0 auto' }}>
              Select your team size to estimate monthly payroll volume and operational hours saved.
            </p>
          </div>

          {/* Interactive Headcount Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
            {[25, 50, 100, 250, 500, 1000].map((count) => (
              <button
                key={count}
                onClick={() => setHeadcount(count)}
                style={{
                  padding: '12px 24px',
                  borderRadius: 9999,
                  border: headcount === count ? '2px solid #023326' : '1px solid #CBD5E1',
                  backgroundColor: headcount === count ? '#023326' : '#FFFFFF',
                  color: headcount === count ? '#FFFFFF' : '#334155',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {count} Employees
              </button>
            ))}
          </div>

          {/* Calculated Output Card */}
          <div
            style={{
              backgroundColor: '#FAFAFA',
              borderRadius: 20,
              border: '1px solid #E2E8F0',
              padding: '36px 44px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 32,
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>MONTHLY PAYROLL VOLUME</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginTop: 8 }}>
                ₹ {(totalMonthlyPayroll / 100000).toFixed(1)} Lakhs
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Calculated across all CTC tiers</div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>EPF & ESIC HANDLED</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#047857', marginTop: 8 }}>
                ₹ {(epfEsicHandled / 100000).toFixed(1)} Lakhs
              </div>
              <div style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>Statutory files prepared automatically</div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#023326' }}>HR / CA HOURS SAVED</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#023326', marginTop: 8 }}>
                {hoursSaved} Hours / mo
              </div>
              <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>Reduced from days to 15 minutes</div>
            </div>
          </div>

        </div>
      </section>

      {/* ── INBOUND LEAD CAPTURE & CTA ─────────────────────────────── */}
      <section
        id="contact"
        style={{
          padding: '96px 24px',
          backgroundColor: '#023326',
          color: '#FFFFFF',
          position: 'relative',
        }}
      >
        <div className="scroll-animate" style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          
          <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            DIRECT CONSULTATION WITH PAYROLL EXPERTS
          </div>
          <h2 style={{ fontSize: 'clamp(32px, 4.4vw, 54px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 20 }}>
            Ready to upgrade your enterprise to Ploy.pe?
          </h2>
          <p style={{ fontSize: 16, color: '#A7F3D0', maxWidth: 640, margin: '0 auto 48px auto', lineHeight: 1.6 }}>
            Leave your details below. An executive payroll specialist from NH Associates will call you to walk you through a custom instance.
          </p>

          {/* Embedded Inbound Lead Form */}
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: '36px 40px',
                textAlign: 'left',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
                color: '#0F172A',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rajesh@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mobile / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Technologies Ltd."
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    What are you looking for? (Our USP) *
                  </label>
                  <select
                    value={form.service_interest}
                    onChange={(e) => setForm({ ...form, service_interest: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1.5px solid #023326',
                      fontSize: 14,
                      outline: 'none',
                      backgroundColor: '#F0FDF4',
                      fontWeight: 700,
                      color: '#023326',
                    }}
                  >
                    <option value="SOFTWARE_LICENSE">Software License (Run HR In-House)</option>
                    <option value="MANAGED_OUTSOURCING">Managed Payroll (NH Associates Runs It)</option>
                    <option value="HYBRID">Both / Hybrid Consultation</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Current Total Headcount
                  </label>
                <select
                  value={form.team_size}
                  onChange={(e) => setForm({ ...form, team_size: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="1-20">1 - 20 Employees (Early Stage)</option>
                  <option value="21-50">21 - 50 Employees (Growing)</option>
                  <option value="51-200">51 - 200 Employees (Mid-Market)</option>
                  <option value="201-1000">201 - 1,000 Employees (Enterprise)</option>
                  <option value="1000+">1,000+ Employees (Conglomerate)</option>
                </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 10,
                  backgroundColor: '#023326',
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 10px 25px rgba(2, 51, 38, 0.3)',
                }}
              >
                {submitting ? 'Submitting Inquiry...' : 'Request An Immediate Callback'}
                <ArrowRight size={18} color="#10B981" />
              </button>
            </form>
          ) : (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 20,
                padding: '48px 32px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#10B981', color: '#023326', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <Check size={32} />
              </div>
              <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Callback Request Confirmed!</h3>
              <p style={{ color: '#A7F3D0', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
                Thank you, {form.name}. A senior payroll advisor from NH Associates will call you at {form.phone} shortly.
              </p>
            </div>
          )}

        </div>
      </section>

      {/* ── FOOTER (Unboxed Studio Editorial) ───────────────────────── */}
      <footer style={{ padding: '64px 24px', backgroundColor: '#FFFFFF', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#023326', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
              P
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0F172A' }}>Ploy.pe</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>A product of NH Associates · Chartered Accountants</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: '#64748B' }}>
            Gurugram · Delhi NCR · Mumbai · Bengaluru · India
          </div>

          <div style={{ fontSize: 12, color: '#94A3B8' }}>
            © {new Date().getFullYear()} Ploy.pe by NH Associates. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ── MODAL CALLBACK POPUP ───────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: '36px 40px',
              maxWidth: 480,
              width: '100%',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#64748B',
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 8 }}>
              Schedule Direct Callback
            </h3>
            <p style={{ fontSize: 13.5, color: '#64748B', marginBottom: 24, lineHeight: 1.5 }}>
              Enter your contact details and our senior partner will call you directly.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
              />
              <input
                type="email"
                required
                placeholder="Work Email *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
              />
              <input
                type="tel"
                required
                placeholder="Mobile / WhatsApp Number *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
              />
              <input
                type="text"
                required
                placeholder="Company Name *"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 8,
                  padding: '14px',
                  borderRadius: 10,
                  backgroundColor: '#023326',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 15,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Callback Request'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
