import React from 'react'
import ReactDOM from 'react-dom/client'
import Estimate from './Estimate'
import { Logo } from './Logo'
import { CONFIG } from './estimateConfig'

function Root() {
  return (
    <>
      <style>{`
        .toki-logo-img { height: 48px; width: auto; display: block; }
        @media (max-width: 640px) { .toki-logo-img { height: 36px; } }
      `}</style>
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#fff",
        borderBottom: "1px solid #e5e9f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        fontFamily: "'Noto Sans JP',sans-serif",
      }}>
        <style>{`.toki-tagline{font-size:12px;color:#6b7689;padding-left:14px;border-left:1px solid #e3e8f0}@media(max-width:640px){.toki-tagline{display:none}.toki-sub{display:none}}`}</style>
        <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <Logo />
          <span className="toki-tagline">不動産登記の費用を、かんたんに。</span>
          <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 12, color: "#6b7689", lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, color: "#1a2233" }}>{CONFIG.officeName}</div>
            <div className="toki-sub">不動産会社様向け 概算シミュレーター</div>
          </div>
        </div>
      </div>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#f5f7fb,#e8ecf4)",
        fontFamily: "'Noto Sans JP',sans-serif",
      }}>
        <Estimate />
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
