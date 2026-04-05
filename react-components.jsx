/**
 * SkillBridge – Premium React UI Components
 * Loaded via Babel Standalone (CDN) — no build step required.
 * Each component hydrates a specific mount-point div in the HTML.
 */

const { useState, useEffect, useRef, useCallback } = React;

/* ─────────────────────────────────────────────────────────────
   1. Animated Counter (runs once when element enters viewport)
   ───────────────────────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return (
    <span ref={ref} className="font-mono text-accent">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   2. Premium Hero Stats Bar
   ───────────────────────────────────────────────────────────── */
function HeroStats() {
  const stats = [
    { value: 12400, suffix: '+', label: 'Workers' },
    { value: 3200, suffix: '+', label: 'Companies' },
    { value: 48, suffix: '', label: 'Trades' },
  ];

  return (
    <div className="react-stats-bar">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className="react-stat-dot" />}
          <div className="react-stat-item">
            <AnimatedCounter target={s.value} suffix={s.suffix} />
            <span className="react-stat-label">{s.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   3. Floating Search Bar (Hero)
   ───────────────────────────────────────────────────────────── */
function HeroSearch() {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState('All Trades');

  const categories = ['All Trades', 'Electrician', 'Plumber', 'Carpenter', 'Mason', 'Painter', 'Driver', 'Welder', 'Domestic Helper'];

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'All Trades') params.set('category', category);
    window.location.href = `job-board.html?${params.toString()}`;
  }

  return (
    <form
      onSubmit={handleSearch}
      className={`react-hero-search ${focused ? 'react-hero-search--focused' : ''}`}
    >
      <div className="react-search-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Search for jobs or skills…"
        className="react-search-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <div className="react-search-divider" />
      <select
        className="react-search-select"
        value={category}
        onChange={e => setCategory(e.target.value)}
      >
        {categories.map(c => <option key={c}>{c}</option>)}
      </select>
      <button type="submit" className="react-search-btn">
        Find Jobs
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────
   4. Premium Testimonials Carousel with auto-play
   ───────────────────────────────────────────────────────────── */
function TestimonialsCarousel() {
  const testimonials = [
    {
      quote: "SkillBridge connected me with three reliable contractors in my first week. It's cut through the noise of traditional job boards entirely.",
      name: 'Sarah Jenkins',
      role: 'Operations Manager, BuildCo',
      initials: 'SJ',
      color: '#2B4C3F',
    },
    {
      quote: "I used to rely strictly on word of mouth. Now I can show pictures of my work and get hired based on my actual skills.",
      name: 'Mike Ramirez',
      role: 'Master Electrician',
      initials: 'MR',
      color: '#C84B31',
    },
    {
      quote: "Found my dream project within 48 hours of signing up. The platform's trade-specific filter is exactly what the industry needed.",
      name: 'Angela Torres',
      role: 'Freelance Carpenter',
      initials: 'AT',
      color: '#E8A838',
    },
  ];

  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  const next = useCallback(() => setActive(a => (a + 1) % testimonials.length), [testimonials.length]);
  const prev = () => setActive(a => (a - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [next]);

  function go(i) {
    clearInterval(timerRef.current);
    setActive(i);
    timerRef.current = setInterval(next, 5000);
  }

  const t = testimonials[active];

  return (
    <div className="react-carousel">
      <div className="react-carousel-quote-icon">"</div>
      <p className="react-carousel-quote">{t.quote}</p>
      <div className="react-carousel-author">
        <div className="react-carousel-avatar" style={{ background: t.color }}>{t.initials}</div>
        <div>
          <strong className="react-carousel-name">{t.name}</strong>
          <div className="react-carousel-role">{t.role}</div>
        </div>
      </div>
      <div className="react-carousel-controls">
        <button className="react-carousel-btn" onClick={prev} aria-label="Previous">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="react-carousel-dots">
          {testimonials.map((_, i) => (
            <button
              key={i}
              className={`react-carousel-dot ${i === active ? 'react-carousel-dot--active' : ''}`}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <button className="react-carousel-btn" onClick={next} aria-label="Next">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   5. Floating Toast Notification (appears 3 s after load)
   ───────────────────────────────────────────────────────────── */
const ACTIVITY_FEED = [
  { name: 'Rahul M.', action: 'applied for Electrician', time: '2 min ago' },
  { name: 'Carlos B.', action: 'posted a Plumber role', time: '5 min ago' },
  { name: 'Priya S.', action: 'joined as Carpenter', time: '8 min ago' },
  { name: 'James K.', action: 'was hired as Mason', time: '12 min ago' },
  { name: 'Anita R.', action: 'updated her Welder profile', time: '15 min ago' },
];

function ActivityToast() {
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    };

    const firstDelay = setTimeout(() => {
      show();
      const interval = setInterval(() => {
        setIdx(i => (i + 1) % ACTIVITY_FEED.length);
        show();
      }, 8000);
      return () => clearInterval(interval);
    }, 3000);

    return () => clearTimeout(firstDelay);
  }, []);

  const item = ACTIVITY_FEED[idx];

  return (
    <div className={`react-activity-toast ${visible ? 'react-activity-toast--visible' : ''}`} role="status" aria-live="polite">
      <div className="react-activity-toast__icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2B4C3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div className="react-activity-toast__body">
        <strong>{item.name}</strong> {item.action}
        <div className="react-activity-toast__time">{item.time}</div>
      </div>
      <button
        className="react-activity-toast__close"
        onClick={() => setVisible(false)}
        aria-label="Close"
      >×</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   6. Premium "How It Works" Steps  (replaces static step-cards)
   ───────────────────────────────────────────────────────────── */
function HowItWorksSteps() {
  const steps = [
    {
      num: '01',
      title: 'Create a Profile',
      desc: 'Tell us what you do, where you work, and show off your past projects with photos and reviews.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      num: '02',
      title: 'Find the Match',
      desc: 'Employers search for your exact skills, or you browse open local jobs filtered by trade and location.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      num: '03',
      title: 'Get to Work',
      desc: 'Connect directly, agree on terms, and start building reputations together. No middlemen.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
  ];

  const [visibleIdx, setVisibleIdx] = useState(-1);
  const refs = useRef([]);

  useEffect(() => {
    const observers = steps.map((_, i) => {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setVisibleIdx(prev => Math.max(prev, i)); },
        { threshold: 0.25 }
      );
      if (refs.current[i]) obs.observe(refs.current[i]);
      return obs;
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <div className="react-steps">
      {steps.map((s, i) => (
        <div
          key={s.num}
          ref={el => refs.current[i] = el}
          className={`react-step ${i <= visibleIdx ? 'react-step--visible' : ''}`}
          style={{ transitionDelay: `${i * 0.15}s` }}
        >
          {i < steps.length - 1 && <div className="react-step-connector" />}
          <div className="react-step-number">{s.num}</div>
          <div className="react-step-icon">{s.icon}</div>
          <h3 className="react-step-title">{s.title}</h3>
          <p className="react-step-desc">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   7. Premium Scroll-Progress Bar (top of page)
   ───────────────────────────────────────────────────────────── */
function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="react-scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
  );
}

/* ─────────────────────────────────────────────────────────────
   8. Premium CTA Banner with gradient shimmer
   ───────────────────────────────────────────────────────────── */
function CTABanner() {
  return (
    <div className="react-cta-banner">
      <div className="react-cta-shimmer" />
      <div className="react-cta-content">
        <span className="react-cta-badge">🔥 Join 12,400+ workers</span>
        <h2 className="react-cta-title">Are you a skilled worker?</h2>
        <p className="react-cta-subtitle">Build your profile today and get discovered by local employers. It's free and takes less than 2 minutes.</p>
        <div className="react-cta-actions">
          <a href="auth.html?role=worker" className="react-cta-btn react-cta-btn--primary">Create Your Profile</a>
          <a href="worker-board.html" className="react-cta-btn react-cta-btn--ghost">Browse Workers</a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MOUNT ALL COMPONENTS
   ───────────────────────────────────────────────────────────── */
function mountIfExists(id, Component, props = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const root = ReactDOM.createRoot(el);
  root.render(React.createElement(Component, props));
}

// Run after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  mountIfExists('react-scroll-progress', ScrollProgressBar);
  mountIfExists('react-hero-stats', HeroStats);
  mountIfExists('react-hero-search', HeroSearch);
  mountIfExists('react-how-it-works', HowItWorksSteps);
  mountIfExists('react-testimonials', TestimonialsCarousel);
  mountIfExists('react-cta-banner', CTABanner);
  mountIfExists('react-activity-toast', ActivityToast);
});
