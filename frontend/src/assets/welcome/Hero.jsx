import React from "react";
import Microscope from "./assets/Microscope.png";
import TabletDashboard from "./assets/Tablet_Dashboard.png";
import DoctorFemale from "./assets/Doctor_Female_Profile.png";
import DoctorMale from "./assets/Doctor_Male_Profile.png";
import BrainVisual from "./assets/Connected_Brain_Visual.png";
import KnowledgeBook from "./assets/Knowledge_Book.png";

const styles = {
  wrapper: {
    width: "100%",
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0b0f2a 0%, #0d1540 40%, #0b1a3a 70%, #060c1f 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#fff",
    overflow: "hidden",
    position: "relative",
    paddingBottom: "0",
  },

  /* ── ambient glow layers behind brain ── */
  ambientGlow: {
    position: "absolute",
    top: "28%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "520px",
    height: "520px",
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse at center, rgba(0,180,255,0.18) 0%, rgba(0,100,255,0.10) 40%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },

  /* ── HEADER ── */
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "28px",
    zIndex: 10,
    gap: "2px",
  },
  logoWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "4px",
  },
  logoCircle: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1a3a8f 0%, #1565c0 50%, #0d47a1 100%)",
    border: "2px solid rgba(100,160,255,0.5)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 18px rgba(30,100,255,0.5)",
  },
  logoIconText: {
    fontSize: "11px",
    fontWeight: "900",
    color: "#fff",
    letterSpacing: "0.5px",
    lineHeight: "1.1",
    textAlign: "center",
  },
  logoSubText: {
    fontSize: "6.5px",
    color: "rgba(200,220,255,0.9)",
    letterSpacing: "0.5px",
    marginTop: "1px",
  },
  brandName: {
    fontSize: "10.5px",
    fontWeight: "700",
    color: "rgba(200,220,255,0.85)",
    letterSpacing: "2.5px",
    marginTop: "7px",
    textTransform: "uppercase",
  },
  welcomeText: {
    fontSize: "28px",
    fontWeight: "400",
    color: "#c8d8f8",
    letterSpacing: "1px",
    marginTop: "14px",
    lineHeight: "1",
  },
  iconnectText: {
    fontSize: "60px",
    fontWeight: "900",
    background: "linear-gradient(90deg, #f59e0b 0%, #fb923c 40%, #f97316 70%, #ea580c 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "2px",
    lineHeight: "1.05",
    marginTop: "2px",
    textShadow: "none",
    filter: "drop-shadow(0 0 12px rgba(251,146,60,0.55))",
  },

  /* ── SCENE ── */
  scene: {
    position: "relative",
    width: "100%",
    maxWidth: "480px",
    height: "420px",
    marginTop: "4px",
    zIndex: 2,
  },

  /* orbit rings */
  orbitOuter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "370px",
    height: "370px",
    borderRadius: "50%",
    border: "1px solid rgba(80,160,255,0.20)",
    pointerEvents: "none",
  },
  orbitInner: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    border: "1px solid rgba(80,160,255,0.15)",
    pointerEvents: "none",
  },

  /* brain */
  brain: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "240px",
    height: "240px",
    objectFit: "contain",
    zIndex: 5,
    filter: "drop-shadow(0 0 24px rgba(0,180,255,0.7))",
  },

  /* doctors */
  doctorMale: {
    position: "absolute",
    bottom: "0px",
    left: "12px",
    height: "310px",
    objectFit: "contain",
    zIndex: 3,
    filter: "drop-shadow(-4px 0 18px rgba(0,60,180,0.35))",
  },
  doctorFemale: {
    position: "absolute",
    bottom: "0px",
    right: "12px",
    height: "310px",
    objectFit: "contain",
    zIndex: 3,
    filter: "drop-shadow(4px 0 18px rgba(0,60,180,0.35))",
  },

  /* ── floating icon bubbles ── */
  floatBubble: {
    position: "absolute",
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    background: "rgba(15,30,80,0.75)",
    border: "1.5px solid rgba(100,160,255,0.30)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 8,
    boxShadow: "0 0 14px rgba(0,100,255,0.25), inset 0 0 8px rgba(0,120,255,0.10)",
  },
  bubbleImg: {
    width: "36px",
    height: "36px",
    objectFit: "contain",
  },
  /* label pill next to bubble */
  labelPill: {
    position: "absolute",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(10,22,60,0.70)",
    border: "1px solid rgba(100,160,255,0.22)",
    borderRadius: "20px",
    padding: "4px 10px 4px 7px",
    backdropFilter: "blur(6px)",
    zIndex: 9,
  },
  labelDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#f97316",
    boxShadow: "0 0 6px #f97316",
    flexShrink: 0,
  },
  labelText: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#e2e8f0",
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
  },

  /* ── DESCRIPTION CARD ── */
  descCard: {
    background: "rgba(15,30,70,0.65)",
    border: "1px solid rgba(100,160,255,0.20)",
    borderRadius: "14px",
    padding: "16px 24px",
    maxWidth: "340px",
    textAlign: "center",
    backdropFilter: "blur(10px)",
    zIndex: 10,
    marginTop: "12px",
    boxShadow: "0 4px 30px rgba(0,50,200,0.15)",
  },
  descText: {
    fontSize: "13.5px",
    lineHeight: "1.6",
    color: "rgba(220,230,255,0.88)",
    fontWeight: "400",
  },

  /* ── CTA BUTTON ── */
  ctaButton: {
    marginTop: "18px",
    padding: "15px 72px",
    background: "linear-gradient(90deg, #f59e0b 0%, #fb923c 50%, #f97316 100%)",
    border: "none",
    borderRadius: "50px",
    color: "#fff",
    fontSize: "17px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    cursor: "pointer",
    boxShadow: "0 4px 24px rgba(249,115,22,0.55), 0 0 40px rgba(249,115,22,0.25)",
    zIndex: 10,
    transition: "transform 0.15s, box-shadow 0.15s",
  },

  /* ── FOOTER ── */
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0",
    marginTop: "22px",
    paddingBottom: "24px",
    zIndex: 10,
    width: "100%",
    maxWidth: "360px",
  },
  footerItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    flex: "1",
  },
  footerDivider: {
    width: "1px",
    height: "36px",
    background: "rgba(100,160,255,0.25)",
    flexShrink: 0,
  },
  footerIcon: {
    fontSize: "22px",
    lineHeight: "1",
  },
  footerLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "rgba(200,220,255,0.80)",
    letterSpacing: "0.5px",
  },
};

export default function Hero() {
  return (
    <div style={styles.wrapper}>
      {/* ambient glow */}
      <div style={styles.ambientGlow} />

      {/* ── HEADER ── */}
      <div style={styles.header}>
        <div style={styles.logoWrap}>
          <div style={styles.logoCircle}>
            <span style={styles.logoIconText}>ICON</span>
            <span style={styles.logoSubText}>LIFE</span>
          </div>
          <span style={styles.brandName}>ICON LIFE SCIENCES</span>
        </div>
        <span style={styles.welcomeText}>Welcome to</span>
        <span style={styles.iconnectText}>iCONNECT</span>
      </div>

      {/* ── SCENE ── */}
      <div style={styles.scene}>
        {/* orbit rings */}
        <div style={styles.orbitOuter} />
        <div style={styles.orbitInner} />

        {/* brain */}
        <img src={BrainVisual} alt="Connected Brain" style={styles.brain} />

        {/* doctors */}
        <img src={DoctorMale}   alt="Male Doctor"   style={styles.doctorMale} />
        <img src={DoctorFemale} alt="Female Doctor" style={styles.doctorFemale} />

        {/* ── Microscope bubble (top-left) + Psychiatry label ── */}
        <div style={{ ...styles.floatBubble, top: "46px", left: "72px" }}>
          <img src={Microscope} alt="Microscope" style={styles.bubbleImg} />
        </div>
        <div style={{ ...styles.labelPill, top: "52px", left: "136px" }}>
          <span style={styles.labelDot} />
          <span style={styles.labelText}>Psychiatry</span>
        </div>

        {/* ── Book bubble (top-right) + Neurology label ── */}
        <div style={{ ...styles.floatBubble, top: "46px", right: "72px" }}>
          <img src={KnowledgeBook} alt="Book" style={styles.bubbleImg} />
        </div>
        <div style={{ ...styles.labelPill, top: "52px", right: "136px" }}>
          <span style={styles.labelDot} />
          <span style={styles.labelText}>Neurology</span>
        </div>

        {/* ── Tablet bubble (bottom-left) + Neurosurgery label ── */}
        <div style={{ ...styles.floatBubble, bottom: "64px", left: "82px" }}>
          <img src={TabletDashboard} alt="Tablet" style={styles.bubbleImg} />
        </div>
        <div style={{ ...styles.labelPill, bottom: "70px", left: "146px" }}>
          <span style={styles.labelDot} />
          <span style={styles.labelText}>Neurosurgery</span>
        </div>
      </div>

      {/* ── DESCRIPTION ── */}
      <div style={styles.descCard}>
        <p style={styles.descText}>
          An educational initiative by ICON LIFE SCIENCES — supporting post-graduates in
          Psychiatry, Neurology &amp; Neurosurgery.
        </p>
      </div>

      {/* ── CTA ── */}
      <button
        style={styles.ctaButton}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "scale(1.04)";
          e.currentTarget.style.boxShadow =
            "0 6px 30px rgba(249,115,22,0.70), 0 0 50px rgba(249,115,22,0.30)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow =
            "0 4px 24px rgba(249,115,22,0.55), 0 0 40px rgba(249,115,22,0.25)";
        }}
      >
        Start Learning
      </button>

      {/* ── FOOTER ── */}
      <div style={styles.footer}>
        <div style={styles.footerItem}>
          <span style={styles.footerIcon}>🎓</span>
          <span style={styles.footerLabel}>Learn</span>
        </div>
        <div style={styles.footerDivider} />
        <div style={styles.footerItem}>
          <span style={styles.footerIcon}>🌱</span>
          <span style={styles.footerLabel}>Grow</span>
        </div>
        <div style={styles.footerDivider} />
        <div style={styles.footerItem}>
          <span style={styles.footerIcon}>📊</span>
          <span style={styles.footerLabel}>Excel</span>
        </div>
      </div>
    </div>
  );
}
