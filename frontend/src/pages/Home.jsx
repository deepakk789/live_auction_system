import { useNavigate } from "react-router-dom";
import {
  Zap, Activity, Users, ShieldCheck, Trophy, Server,
  PlayCircle, FileText, CheckCircle, Settings,
  ChevronUp, Timer, Gavel, ArrowRight,
  Radio, Mail
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import "../styles/home-new.css";
import PageTransition from "../components/PageTransition";
import BorderGlow from "../components/BorderGlow";
import { FEATURE_GLOW_PROPS, LIVE_PANEL_GLOW_PROPS } from "../components/borderGlowTheme";


// DATA
const STATS = [
  { value: "Live", label: "Auctions", sub: "Real-time bidding updates" },
  { value: "Teams", label: "Management", sub: "Create and manage teams" },
  { value: "Pool", label: "Player Pool", sub: "Dynamic player allocation" },
  { value: "Sync", label: "WebSocket Sync", sub: "Instant bid propagation" },
];

const FEATURES = [
  {
    icon: Activity,
    title: "Live Economic Analytics",
    description: "Track team budgets, real-time player data, and manage your economy as the auction progresses with live charts.",
    color: "#3b82f6",
  },
  {
    icon: Zap,
    title: "Remote Online Bidding",
    description: "Allow teams to bid from mobile devices with zero latency. Globally synced over WebSockets in real-time.",
    color: "#eab308",
  },
  {
    icon: Trophy,
    title: "Co-Organizer Delegation",
    description: "Invite trusted members to manage the board. Real-time locking ensures only one admin edits at a time.",
    color: "#10b981",
  },
  {
    icon: ShieldCheck,
    title: "Automated Failsafes",
    description: "Smart constraints monitor team purses, automatically blocking bids that exceed maximum allowed budgets.",
    color: "#ec4899",
  },
  {
    icon: Server,
    title: "Persistent Cloud State",
    description: "Powered by MongoDB. Your auction state is continuously saved — recover instantly from any crash.",
    color: "#8b5cf6",
  },
  {
    icon: PlayCircle,
    title: "Broadcast-Ready Interface",
    description: "Dedicated spectator views give audiences beautiful, distraction-free visual updates as the action unfolds.",
    color: "#f97316",
  },
];

const STEPS = [
  {
    icon: Settings,
    number: "01",
    title: "Configure Rules",
    desc: "Set the number of teams, maximum starting budgets, and choose between Manual or Online bidding modes.",
    color: "#3b82f6",
  },
  {
    icon: FileText,
    number: "02",
    title: "Build Roster",
    desc: "Upload player names and base prices directly into the upcoming platform queue in seconds.",
    color: "#8b5cf6",
  },
  {
    icon: Zap,
    number: "03",
    title: "Run the Podium",
    desc: "Go Live! Teams bid using connected devices until the highest bid is legally locked by the auctioneer.",
    color: "#eab308",
  },
  {
    icon: CheckCircle,
    number: "04",
    title: "Transfer & Archive",
    desc: "Drop the hammer. Player is marked SOLD, budget deducted, and real-time ledgers instantly archived.",
    color: "#10b981",
  },
];

const MOCK_BID_HISTORY = [
  { team: "Royal Challengers", amount: "₹1,850L", rank: 1 },
  { team: "Mumbai Indians",    amount: "₹1,800L", rank: 2 },
  { team: "Chennai Super Kings",amount: "₹1,700L", rank: 3 },
  { team: "Delhi Capitals",    amount: "₹1,600L", rank: 4 },
];

// ANIMATED COUNTER
function LiveTimer() {
  const [seconds, setSeconds] = useState(28);
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s > 0 ? s - 1 : 30), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`hn-timer-val ${seconds <= 5 ? "hn-timer-urgent" : ""}`}>
      {seconds}s
    </span>
  );
}

// SECTION: HERO
function HeroSection({ navigate }) {
  const [showStamp, setShowStamp] = useState(false);
  const [stampOut, setStampOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowStamp(true), 1400);
    const t2 = setTimeout(() => setStampOut(true), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <section className="hn-hero">
      {/* Grid background */}
      <div className="hn-grid-bg" />
      {/* Radial glow */}
      <div className="hn-radial-glow" />

      <div className="hn-hero-inner">
        {/* Live badge */}
        <div className="hn-live-badge hn-fade-up" style={{ animationDelay: "0.1s" }}>
          <span className="hn-pulse-dot">
            <span className="hn-pulse-ring" />
          </span>
          Live Auction in Progress
        </div>

        {/* Logo */}
        <div className="hn-logo-block hn-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="hn-logo-icon">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
              <polygon points="15,20 40,20 85,85 60,85" fill="#fff" />
              <polygon points="85,20 60,20 15,85 40,85" fill="#fff" />
              <polygon points="5,75 70,10 85,10 20,85" fill="#10b981" stroke="#0b1120" strokeWidth="4" strokeLinejoin="round" />
              <polygon points="20,95 85,30 100,30 35,105" fill="#059669" stroke="#0b1120" strokeWidth="4" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="hn-logo-text">
            AUCTION<span className="hn-logo-accent">X</span>
          </span>
        </div>

        {/* Title */}
        <h1 className="hn-title hn-fade-up" style={{ animationDelay: "0.3s" }}>
          The Ultimate<br />
          <span className="hn-title-gradient">Auction Orchestration</span><br />
          Platform
        </h1>

        {/* SOLD stamp */}
        {showStamp && (
          <div className={`hn-sold-stamp ${stampOut ? "hn-sold-stamp-out" : ""}`}>
            <span className="hn-sold-sub">OFFICIALLY</span>
            SOLD!
          </div>
        )}

        {/* Subtitle */}
        <p className="hn-subtitle hn-fade-up" style={{ animationDelay: "0.4s" }}>
          Seamlessly manage players, teams, and live bids with our state-of-the-art
          interactive dashboard. Built for organizers, trusted by viewers.
        </p>

        {/* CTA Buttons */}
        <div className="hn-cta-row hn-fade-up" style={{ animationDelay: "0.5s" }}>
          <button className="hn-btn-primary" onClick={() => navigate("/create-auction")}>
            <Zap size={18} />
            Organise an Auction
            <ArrowRight size={16} className="hn-arrow" />
          </button>
          <button className="hn-btn-secondary" onClick={() => navigate("/live")}>
            <Radio size={18} />
            Join as Viewer
          </button>
        </div>

        {/* Stats */}
        <div className="hn-hero-stats hn-fade-up" style={{ animationDelay: "0.6s" }}>
          {STATS.map(s => (
            <div key={s.label} className="hn-hero-stat">
              <span className="hn-hero-stat-val">{s.value}</span>
              <span className="hn-hero-stat-label">{s.label}</span>
              <span className="hn-hero-stat-sub">{s.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="hn-hero-fade-bottom" />
    </section>
  );
}

// SECTION: LIVE AUCTION PREVIEW
function LiveAuctionSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} id="live-preview" className={`hn-section hn-section-live ${visible ? "hn-in-view" : ""}`}>
      <div className="hn-container">
        {/* Header */}
        <div className="hn-section-header hn-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="hn-live-label">
            <span className="hn-pulse-dot"><span className="hn-pulse-ring" /></span>
            Live Auction
          </div>
          <h2 className="hn-section-title">Current Bid Session</h2>
          <p className="hn-section-sub">
            Watch the action unfold in real-time. Place your bids and secure your star players.
          </p>
        </div>

        <div className="hn-auction-grid">
          {/* Player Card */}
          <div className="hn-glow-cell hn-slide-up" style={{ animationDelay: "0.2s" }}>
          <BorderGlow
            {...LIVE_PANEL_GLOW_PROPS}
            className="hn-live-glow-wrap"
          >
            <div className="hn-player-inner">
              {/* Avatar */}
              <div className="hn-avatar-wrap">
                <div className="hn-avatar">
                  <span className="hn-avatar-letter">V</span>
                </div>
                <span className="hn-avatar-country">India</span>
              </div>

              {/* Info */}
              <div className="hn-player-info">
                <div className="hn-player-name-row">
                  <h3 className="hn-player-name">Virat Kohli</h3>
                  <span className="hn-role-badge">Batsman</span>
                </div>

                <div className="hn-stats-grid">
                  <div className="hn-stat-box"><div className="hn-stat-v">7,263</div><div className="hn-stat-l">Runs</div></div>
                  <div className="hn-stat-box"><div className="hn-stat-v">237</div><div className="hn-stat-l">Matches</div></div>
                  <div className="hn-stat-box"><div className="hn-stat-v">37.25</div><div className="hn-stat-l">Average</div></div>
                </div>

                <div className="hn-current-bid-row">
                  <div>
                    <div className="hn-bid-label">Current Bid</div>
                    <div className="hn-bid-amount">₹1,850L</div>
                    <div className="hn-bid-by">by Royal Challengers</div>
                  </div>
                  <div className="hn-bid-action">
                    <div className="hn-timer-row">
                      <Timer size={16} className="hn-timer-icon" />
                      <LiveTimer />
                    </div>
                    <button className="hn-btn-bid">
                      <ChevronUp size={18} />
                      Place Bid
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </BorderGlow>
          </div>

          {/* Bid History Panel */}
          <div className="hn-glow-cell hn-slide-up" style={{ animationDelay: "0.3s" }}>
          <BorderGlow
            {...LIVE_PANEL_GLOW_PROPS}
            className="hn-bid-panel-glow"
          >
            <div className="hn-bid-panel-header">
              <div className="hn-icon-wrap"><Gavel size={18} /></div>
              <div>
                <div className="hn-bid-panel-title">Bid History</div>
                <div className="hn-bid-panel-sub">Last 4 bids</div>
              </div>
            </div>

            <div className="hn-bid-list">
              {MOCK_BID_HISTORY.map((bid, i) => (
                <div key={bid.team} className={`hn-bid-item ${i === 0 ? "hn-bid-item-top" : ""}`}>
                  <div className="hn-bid-rank-wrap">
                    <span className={`hn-bid-rank ${i === 0 ? "hn-bid-rank-top" : ""}`}>{bid.rank}</span>
                    <span className="hn-bid-team">{bid.team}</span>
                  </div>
                  <span className={`hn-bid-amt ${i === 0 ? "hn-bid-amt-top" : ""}`}>{bid.amount}</span>
                </div>
              ))}
            </div>

            <div className="hn-bid-mini-stats">
              <div className="hn-mini-stat">
                <Users size={16} className="hn-mini-icon" />
                <div className="hn-mini-val">8</div>
                <div className="hn-mini-label">Teams Bidding</div>
              </div>
              <div className="hn-mini-stat">
                <Gavel size={16} className="hn-mini-icon" />
                <div className="hn-mini-val">24</div>
                <div className="hn-mini-label">Total Bids</div>
              </div>
            </div>
          </BorderGlow>
          </div>
        </div>
      </div>
    </section>
  );
}

// SECTION: FEATURES
function FeaturesSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} id="features" className={`hn-section ${visible ? "hn-in-view" : ""}`}>
      {/* Dot pattern background */}
      <div className="hn-dot-bg" />
      <div className="hn-container">
        <div className="hn-section-header hn-slide-up" style={{ animationDelay: "0.1s" }}>
          <span className="hn-eyebrow">Platform Features</span>
          <h2 className="hn-section-title">Everything You Need</h2>
          <p className="hn-section-sub">
            A complete auction management system designed for professional leagues.
          </p>
        </div>

        <div className="hn-features-grid">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="hn-glow-cell hn-slide-up"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <BorderGlow {...FEATURE_GLOW_PROPS} className="hn-feature-glow-wrap">
                <div className="hn-feature-icon" style={{ "--icon-color": f.color }}>
                  <f.icon size={22} />
                </div>
                <h3 className="hn-feature-title">{f.title}</h3>
                <p className="hn-feature-desc">{f.description}</p>
              </BorderGlow>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// SECTION: HOW IT WORKS
function HowItWorksSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className={`hn-section hn-section-hiw ${visible ? "hn-in-view" : ""}`}>
      <div className="hn-container">
        <div className="hn-section-header hn-slide-up" style={{ animationDelay: "0.1s" }}>
          <span className="hn-eyebrow">The Process</span>
          <h2 className="hn-section-title">
            From Setup to <span className="hn-title-success">Sold</span>
          </h2>
          <p className="hn-section-sub">
            A fast overview of how an auction orchestrates from start to finish.
          </p>
        </div>

        <div className="hn-steps-grid">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="hn-glow-cell hn-slide-up"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <BorderGlow {...FEATURE_GLOW_PROPS} className="hn-step-glow-wrap">
                <div className="hn-step-number">{step.number}</div>
                <div className="hn-step-icon" style={{ "--icon-color": step.color }}>
                  <step.icon size={28} />
                </div>
                <h4 className="hn-step-title">{step.title}</h4>
                <p className="hn-step-desc">{step.desc}</p>
              </BorderGlow>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// SECTION: FOOTER CTA
function FooterSection({ navigate }) {
  return (
    <footer className="hn-footer">
      {/* CTA Banner */}
      <div className="hn-container">
        <div className="hn-cta-banner">
          <div className="hn-cta-text">
            <h3 className="hn-cta-title">Ready to Start Your Auction?</h3>
            <p className="hn-cta-sub">
              Join the platform built for organizers who demand real-time control, zero lag, and broadcast-quality display.
            </p>
          </div>
          <button className="hn-btn-primary" onClick={() => navigate("/create-auction")}>
            Get Started Free
            <ArrowRight size={16} className="hn-arrow" />
          </button>
        </div>

        {/* Footer links */}
        <div className="hn-footer-grid">
          <div className="hn-footer-brand">
            <div className="hn-logo-block" style={{ marginBottom: "12px" }}>
              <div className="hn-logo-icon hn-logo-icon-sm">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                  <polygon points="15,20 40,20 85,85 60,85" fill="#fff" />
                  <polygon points="85,20 60,20 15,85 40,85" fill="#fff" />
                  <polygon points="5,75 70,10 85,10 20,85" fill="#10b981" stroke="#0b1120" strokeWidth="4" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="hn-logo-text" style={{ fontSize: "1.1rem" }}>
                AUCTION<span className="hn-logo-accent">X</span>
              </span>
            </div>
            <p className="hn-footer-tagline">
              The ultimate platform for live player auctions. Build your dream team.
            </p>
          </div>

          <div className="hn-footer-col">
            <h4 className="hn-footer-col-title">Product</h4>
            <ul className="hn-footer-links">
              <li><button onClick={() => navigate("/live")} className="hn-footer-link">Live Auctions</button></li>
              <li><button onClick={() => navigate("/upcoming")} className="hn-footer-link">Upcoming Auctions</button></li>
              <li><button onClick={() => navigate("/past")} className="hn-footer-link">Past Auctions</button></li>
              <li><button onClick={() => navigate("/create-auction")} className="hn-footer-link">Create Auction</button></li>
            </ul>
          </div>

          <div className="hn-footer-col">
            <h4 className="hn-footer-col-title">Contact</h4>
            <ul className="hn-footer-links">
              <li>
                <a href="mailto:support@auctionx.com" className="hn-footer-link hn-footer-link-email">
                  <Mail size={14} />
                  support@auctionx.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="hn-footer-bottom">
          <p>© {new Date().getFullYear()} AuctionX Orchestration. All rights reserved.</p>
          <div className="hn-footer-socials">
            {["Twitter", "Discord", "GitHub"].map(s => (
              <a key={s} href="#" className="hn-footer-link">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ROOT
export default function Home() {
  const navigate = useNavigate();
  return (
    <PageTransition>
      <div className="hn-root">
        <HeroSection navigate={navigate} />
        <LiveAuctionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FooterSection navigate={navigate} />
      </div>
    </PageTransition>
  );
}
