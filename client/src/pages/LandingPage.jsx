import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    team_size: '21-100',
    notes: '',
  });

  useEffect(() => {
    function handleScroll() {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/leads', form);
      toast.success('Inquiry received! We will call you shortly.');
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF', color: '#0F172A', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Top Scroll Progress Indicator */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 3,
          backgroundColor: '#10B981',
          width: `${scrollProgress}%`,
          zIndex: 100,
          transition: 'width 0.1s linear',
        }}
      />

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#023326',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              P
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em', color: '#0F172A' }}>
                Ploy.pe
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                by NH Associates
              </div>
            </div>
          </div>

          <nav style={{ display: 'none', gap: 28, fontSize: 14, fontWeight: 600, color: '#475569' }} className="md-flex">
            <a href="#why-us" style={{ color: 'inherit', textDecoration: 'none' }}>Why Ploy.pe</a>
            <a href="#timeline" style={{ color: 'inherit', textDecoration: 'none' }}>Payroll Timeline</a>
            <a href="#capabilities" style={{ color: 'inherit', textDecoration: 'none' }}>Capabilities</a>
            <a href="#contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
              Sign In
            </button>
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
                boxShadow: '0 4px 12px rgba(2, 51, 38, 0.2)',
              }}
            >
              Request a demo
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Fluid, No Boxes) ───────────────────────────── */}
      <section style={{ position: 'relative', paddingTop: 80, paddingBottom: 100, textAlign: 'center', background: 'radial-gradient(circle 800px at 50% -100px, rgba(16, 185, 129, 0.08), transparent 70%)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 9999, backgroundColor: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 700, marginBottom: 28 }}>
            <span>✨</span>
            <span>Simplify HR, Empower Teams with Ploy.pe</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.08, color: '#0F172A', marginBottom: 24 }}>
            Next-Gen HR & Payroll Platform for Growing Teams
          </h1>

          <p style={{ fontSize: 18, color: '#475569', maxWidth: 640, margin: '0 auto 36px auto', lineHeight: 1.6 }}>
            Streamline hiring, automate salary workflows, and empower your team with a complete HR and payroll system built for modern businesses.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 36 }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                backgroundColor: '#023326',
                color: '#FFFFFF',
                borderRadius: 9999,
                fontSize: 15,
                fontWeight: 700,
                padding: '14px 32px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(2, 51, 38, 0.25)',
              }}
            >
              Request a demo
            </button>
          </div>

          {/* Ratings */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, fontSize: 13, color: '#64748B', marginBottom: 70 }}>
            <div><strong style={{ color: '#F59E0B' }}>★★★★★ 4.7</strong> on G2.com</div>
            <span>/</span>
            <div><strong style={{ color: '#F59E0B' }}>★★★★★ 4.5</strong> on Capterra</div>
          </div>

          {/* Fluid Metrics - No Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40, textAlign: 'left', borderTop: '1px solid #F1F5F9', paddingTop: 50 }}>
            <div style={{ borderLeft: '3px solid #10B981', paddingLeft: 18 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>14 Days</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>Accelerated Hiring</div>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                35% faster candidate pipelines from sourcing to offer letter generation.
              </p>
            </div>

            <div style={{ borderLeft: '3px solid #10B981', paddingLeft: 18 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>100% On-Time</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>Payroll & Statutory Filing</div>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Automated PF, ESIC, PT, and bank disbursals executed with zero manual calculation errors.
              </p>
            </div>

            <div style={{ borderLeft: '3px solid #10B981', paddingLeft: 18 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', marginBottom: 4 }}>94.8%</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>Workforce Retention</div>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                Empowered managers with transparent OKRs, 360 reviews, and career progression paths.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Partner Logos Strip ─────────────────────────────────────── */}
      <section style={{ padding: '40px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', marginBottom: 24 }}>
            POWERING THE WORLD\'S BEST COMPANIES
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '32px 50px', fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', color: '#94A3B8' }}>
            <span>Webflow</span>
            <span>Discord</span>
            <span>duolingo</span>
            <span>asana</span>
            <span>LinkedIn</span>
            <span>indeed</span>
            <span>zoom</span>
          </div>
        </div>
      </section>

      {/* ── Live Scrubbed Payroll Timeline Stage ────────────────────── */}
      <section id="timeline" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 60px auto' }}>
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10B981', display: 'block', marginBottom: 8 }}>
            Real-Time Engine
          </span>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
            How Ploy.pe Executes Payroll in Seconds
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40 }}>
          <div style={{ borderTop: '4px solid #10B981', paddingTop: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', display: 'block', marginBottom: 8 }}>PHASE 01 / SETUP</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>CTC Version & Rules</h3>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              Client compensation structures (V1, V2, V3) dynamically apply component breakdown, rounding preferences, and PF cap rules.
            </p>
          </div>

          <div style={{ borderTop: '4px solid #10B981', paddingTop: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', display: 'block', marginBottom: 8 }}>PHASE 02 / RECONCILE</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Attendance LOP Proration</h3>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              Biometric attendance syncs directly with editable worked days. Zero manual excel formulas needed for mid-month joiners.
            </p>
          </div>

          <div style={{ borderTop: '4px solid #10B981', paddingTop: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', display: 'block', marginBottom: 8 }}>PHASE 03 / DISBURSE</span>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>1-Click Bank & Tax ECR</h3>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              Instant bank NEFT transfer sheet generation, signed PDF payslip ZIP export, and verified statutory PF/ESI filing reports.
            </p>
          </div>
        </div>
      </section>

      {/* ── Why Choose Ploy.pe Section ──────────────────────────────── */}
      <section id="why-us" style={{ padding: '100px 24px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ maxWidth: 700, marginBottom: 60 }}>
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10B981', display: 'block', marginBottom: 12 }}>
              Why Choose Ploy.pe
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#0F172A', marginBottom: 20 }}>
              Empowers HR with <span style={{ color: '#10B981' }}>AI-driven</span> tools to optimize teams, boost productivity, and drive success.
            </h2>
            <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6 }}>
              Eliminate fragmented spreadsheets and slow legacy portals. Ploy.pe brings performance reviews, payroll proration, goal alignment, and hiring under one seamless experience.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 40, borderTop: '1px solid #E2E8F0', paddingTop: 50 }}>
            <div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#0F172A', marginBottom: 6 }}>5K+</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>Organizations trust Ploy.pe</div>
              <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
                From fast-scaling startups to global enterprise workforces managing complex compensation.
              </p>
            </div>

            <div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#0F172A', marginBottom: 6 }}>78%</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>Reduces administration time</div>
              <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
                Automate routine onboarding, salary adjustments, and statutory compliance paperwork.
              </p>
            </div>

            <div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#10B981', marginBottom: 6 }}>25%</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>Reduced manual operational work</div>
              <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
                Streamlined approval chains and self-service portals free HR teams to focus on team strategy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities (No Boxes, Editorial Columns) ──────────────── */}
      <section id="capabilities" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ maxWidth: 700, marginBottom: 60 }}>
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10B981', display: 'block', marginBottom: 8 }}>
            Improve Manager Productivity
          </span>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
            Empowered Managers, Higher Performing Teams
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48 }}>
          <div>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎯</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Goals & OKRs</h3>
            <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
              Keep teams aligned with cascading goals and transparent OKRs tracked across quarters without disjointed documents.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Analytics & Reviews</h3>
            <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
              Seamlessly connect performance review cycle results into compensation decisions, creating fair and equitable pay outcomes.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🌱</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Grow Career Tracks</h3>
            <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
              Give employees clear paths to advancement with competencies, career tracks, and personalized growth plans.
            </p>
            <div style={{ color: '#10B981', fontWeight: 700, fontSize: 12, marginTop: 8 }}>
              Reduced turnover 27% across scaling teams.
            </div>
          </div>
        </div>
      </section>

      {/* ── Direct Frameless CTA & Lead Form ────────────────────────── */}
      <section id="contact" style={{ padding: '110px 24px', backgroundColor: '#022C22', color: '#FFFFFF' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          
          <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 9999, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#6EE7B7', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
            Get Started Today
          </div>

          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 16 }}>
            One Platform For All Your HR Needs
          </h2>

          <p style={{ fontSize: 16, color: '#A7F3D0', maxWidth: 540, margin: '0 auto 48px auto', lineHeight: 1.6 }}>
            Join thousands of forward-thinking companies streamlining their people and payroll operations with Ploy.pe.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ maxWidth: 580, margin: '0 auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A7F3D0', display: 'block', marginBottom: 6 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Rajiv Menon"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderBottom: '2px solid rgba(110, 231, 183, 0.6)', color: '#FFFFFF', fontSize: 14, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A7F3D0', display: 'block', marginBottom: 6 }}>
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="rajiv@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderBottom: '2px solid rgba(110, 231, 183, 0.6)', color: '#FFFFFF', fontSize: 14, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A7F3D0', display: 'block', marginBottom: 6 }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderBottom: '2px solid rgba(110, 231, 183, 0.6)', color: '#FFFFFF', fontSize: 14, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A7F3D0', display: 'block', marginBottom: 6 }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Apex Technologies Ltd"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderBottom: '2px solid rgba(110, 231, 183, 0.6)', color: '#FFFFFF', fontSize: 14, outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#A7F3D0', display: 'block', marginBottom: 6 }}>
                  Team Size *
                </label>
                <select
                  value={form.team_size}
                  onChange={(e) => setForm({ ...form, team_size: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.08)', border: 'none', borderBottom: '2px solid rgba(110, 231, 183, 0.6)', color: '#FFFFFF', fontSize: 14, outline: 'none' }}
                >
                  <option value="1-20" style={{ color: '#0F172A' }}>1 – 20 Employees</option>
                  <option value="21-100" style={{ color: '#0F172A' }}>21 – 100 Employees</option>
                  <option value="101-500" style={{ color: '#0F172A' }}>101 – 500 Employees</option>
                  <option value="500+" style={{ color: '#0F172A' }}>500+ Employees</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 10,
                  padding: '16px 32px',
                  borderRadius: 9999,
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 15,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                }}
              >
                {submitting ? 'Submitting...' : 'Request Callback & Demo'}
              </button>
            </form>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, color: '#10B981', marginBottom: 12 }}>✓</div>
              <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Inquiry Received!</h3>
              <p style={{ color: '#A7F3D0', fontSize: 14 }}>
                Our senior payroll & HR advisor will call you at your phone number shortly.
              </p>
            </div>
          )}

        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ padding: '60px 24px', backgroundColor: '#FFFFFF', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#64748B' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#023326', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>P</div>
            <span style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>Ploy.pe</span>
            <span style={{ color: '#94A3B8' }}>by NH Associates · Gurugram, India</span>
          </div>
          <div>© 2026 Ploy.pe by NH Associates. All rights reserved.</div>
        </div>
      </footer>

      {/* ── Interactive Modal ───────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 36, maxWidth: 480, width: '100%', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
            >
              ✕
            </button>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 6 }}>
              Schedule A Demo with Ploy.pe
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>
              Leave your details below and an advisor will call you within 15 minutes.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13.5 }}
              />
              <input
                type="email"
                required
                placeholder="Work Email *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13.5 }}
              />
              <input
                type="tel"
                required
                placeholder="Mobile Number *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13.5 }}
              />
              <input
                type="text"
                required
                placeholder="Company Name *"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13.5 }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 10,
                  padding: '12px',
                  borderRadius: 9999,
                  backgroundColor: '#023326',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
