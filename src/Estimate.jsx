// src/Estimate.jsx — 不動産会社向け 登記費用 概算シミュレーター（1画面）
// 固定資産税評価額などを入れるだけで、買主負担（報酬＋登録免許税＋実費）の概算が出る。
// 報酬テーブル・単価は calc.js の既定値を固定で使い、画面からの設定変更はできない。
import { useMemo, useState } from "react";
import { fmt, fmtM } from "./calc";
import { buildEstimate, DEFAULT_INPUT } from "./estimate";
import { CONFIG } from "./estimateConfig";

const C = "#4338ca";
const inputStyle = { background: "#fff", border: "1.5px solid #dce1ea", color: "#1a2233", fontVariantNumeric: "tabular-nums" };
const focus = (e) => { e.target.style.borderColor = C; e.target.style.boxShadow = "0 0 0 3px rgba(67,56,202,0.12)"; };
const blur = (e) => { e.target.style.borderColor = "#dce1ea"; e.target.style.boxShadow = "none"; };

// ── アイコン（インラインSVG） ──
const I = {
  home: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>,
  doc: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h6M10 17h6" /></svg>,
  card: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>,
  mail: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
  bank: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10l9-6 9 6" /><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" /></svg>,
  calc: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0" /></svg>,
  print: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 8V4h10v4" /><rect x="4" y="8" width="16" height="9" rx="2" /><path d="M7 14h10v6H7z" /></svg>,
  info: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h0" /></svg>,
  erase: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
};
const lineIcon = (it) => ({ transfer: I.home, preservation: I.home, mortgage: I.bank, deletion: I.erase, addressChange: I.card })[it.type] || I.doc;

// ── 小パーツ ──
function Step({ n, title, sub }) {
  return (
    <div className="flex items-start gap-2.5 mb-3">
      <span className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-xs font-bold" style={{ width: 24, height: 24, background: C, marginTop: 1 }}>{n}</span>
      <div>
        <div className="text-sm font-bold" style={{ color: "#1a2233" }}>{title}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: "#8393a7" }}>{sub}</div>}
      </div>
    </div>
  );
}
function Help({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle ml-1">
      <button type="button" aria-label="説明" onClick={() => setOpen(!open)} onBlur={() => setOpen(false)} title={text}
        className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
        style={{ width: 15, height: 15, border: "1.5px solid #b8c1d1", color: "#8393a7", background: "#fff", lineHeight: 1 }}>?</button>
      {open && (
        <span className="absolute z-20 left-0 mt-1 rounded-lg p-2.5 text-xs font-normal shadow-lg" style={{ width: 240, background: "#1a2233", color: "#fff", lineHeight: 1.6 }}>{text}</span>
      )}
    </span>
  );
}
function Label({ children, hint, help }) {
  return (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "#3a4557" }}>
      {children}{help && <Help text={help} />}{hint && <span className="ml-1.5 font-normal" style={{ color: "#8393a7" }}>{hint}</span>}
    </label>
  );
}
// 金額入力：カンマ区切りで表示し、数値（円）で保持する
function YenInput({ label, hint, help, value, onChange, placeholder, note }) {
  const n = Number(value) || 0;
  const shown = value === "" || value == null ? "" : n.toLocaleString();
  return (
    <div className="mb-3">
      <Label hint={hint} help={help}>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="text" inputMode="numeric" value={shown} placeholder={placeholder}
          onChange={(e) => { const d = e.target.value.replace(/[^0-9０-９]/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)); onChange(d === "" ? "" : Number(d)); }}
          onFocus={focus} onBlur={blur}
          className="w-full px-3 py-2.5 rounded-lg text-base outline-none text-right" style={inputStyle} />
        <span className="text-xs whitespace-nowrap flex-shrink-0" style={{ color: "#8393a7" }}>円</span>
      </div>
      <div className="text-xs mt-1 min-h-[1rem]" style={{ color: n > 0 ? C : "#a0aec0" }}>{n > 0 ? fmtM(Math.ceil(n / 10000)) : note || ""}</div>
    </div>
  );
}
function Toggle({ label, checked, onChange, color = C, sub }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none py-2" onClick={(e) => { e.preventDefault(); onChange(!checked); }}>
      <div className="relative rounded-full transition-all flex-shrink-0" style={{ width: 40, height: 22, background: checked ? color : "#cbd3df" }}>
        <div className="absolute rounded-full bg-white shadow transition-all" style={{ width: 18, height: 18, top: 2, left: checked ? 20 : 2 }} />
      </div>
      <div>
        <div className="text-sm" style={{ color: "#1a2233", fontWeight: checked ? 700 : 500 }}>{label}</div>
        {sub && <div className="text-xs" style={{ color: "#8393a7" }}>{sub}</div>}
      </div>
    </label>
  );
}
const Row = ({ label, value, sub, bold, color, top }) => (
  <div className="flex justify-between items-baseline gap-3" style={{ padding: "8px 0", borderBottom: "1px solid #edf0f5", borderTop: top ? "1.5px solid #dce1ea" : "none", marginTop: top ? 6 : 0 }}>
    <span className={`text-sm ${bold ? "font-bold" : ""}`} style={{ color: sub ? "#8393a7" : (color || "#3a4557"), paddingLeft: sub ? 14 : 0 }}>{label}</span>
    <span className={`text-sm whitespace-nowrap ${bold ? "font-bold" : "font-medium"}`} style={{ color: color || "#1a2233", fontVariantNumeric: "tabular-nums" }}>{value}</span>
  </div>
);
const Card = ({ children, style, className = "" }) => (
  <div className={`rounded-2xl p-5 mb-4 ${className}`} style={{ background: "#fff", border: "1px solid #e3e8f0", boxShadow: "0 2px 10px rgba(26,34,51,0.05)", ...style }}>{children}</div>
);

// ── 印刷用の概算書（別ウィンドウ） ──
function openPrint(inp, est) {
  const yen = (n) => "¥" + Math.round(n || 0).toLocaleString();
  const cond = [];
  cond.push(est.isTransfer ? "売買による所有権移転" : "新築建物の所有権保存");
  if (est.isTransfer && est.land > 0) cond.push(`土地 評価額 ${yen(est.land)}`);
  if (est.bld > 0) cond.push(`建物 ${est.isTransfer ? "評価額" : "課税標準額"} ${yen(est.bld)}`);
  cond.push(`不動産 ${est.propCount}個`);
  if (inp.kubun) cond.push("区分建物");
  cond.push({ none: "住宅用家屋証明書なし", general: "住宅用家屋証明書（一般住宅）", premium: "住宅用家屋証明書（長期優良・低炭素）" }[inp.housingCert] || "");
  if (inp.hasLoan) cond.push(`抵当権設定 債権額 ${yen(est.loan)}`);
  const block = (title, s) => `
    <h2>${title}</h2>
    <table><thead><tr><th>登記の内容</th><th class=r>報酬（税抜）</th><th class=r>登録免許税</th></tr></thead><tbody>
      ${s.lines.map((l) => `<tr><td>${l.label}${l.addSc ? "（区分建物加算含む）" : ""}</td><td class=r>${yen(l.fee)}</td><td class=r>${yen(l.tax)}</td></tr>`).join("")}
      ${s.jippi.map((j) => `<tr><td>${j.name}</td><td class=r>${j.fee ? yen(j.fee) : "—"}</td><td class=r>${j.jippi ? yen(j.jippi) + "（実費）" : "—"}</td></tr>`).join("")}
    </tbody></table>
    <div class=sum><span>報酬（税抜）</span><b>${yen(s.feeExcl)}</b></div>
    <div class=sum><span>消費税（${CONFIG.taxRate}%）</span><b>${yen(s.consumptionTax)}</b></div>
    <div class=sum><span>登録免許税</span><b>${yen(s.regTax)}</b></div>
    ${s.jippiTotal > 0 ? `<div class=sum><span>実費（非課税）</span><b>${yen(s.jippiTotal)}</b></div>` : ""}
    <div class=tot><span>${title} 合計（概算）</span><span>${yen(s.grand)}</span></div>`;
  const html = `<!doctype html><html lang=ja><head><meta charset=utf-8><title>登記費用 概算</title>
  <style>*{box-sizing:border-box}body{font-family:'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;color:#1a2233;margin:28px;font-size:13px}
  h1{font-size:18px;text-align:center;letter-spacing:.15em;margin:0 0 4px}.date{text-align:center;color:#666;font-size:12px;margin-bottom:12px}
  .cond{background:#f4f6fb;border-radius:6px;padding:8px 12px;font-size:12px;color:#444;margin-bottom:8px;line-height:1.7}
  h2{font-size:13px;background:#eef2ff;padding:5px 9px;border-left:4px solid ${C};margin:16px 0 6px}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #d7dbe3;padding:5px 8px}th{background:#f4f6fb;font-weight:600;font-size:12px;text-align:left}
  .r{text-align:right;font-variant-numeric:tabular-nums}.sum{display:flex;justify-content:space-between;padding:3px 9px}.sum b{font-variant-numeric:tabular-nums}
  .tot{margin-top:8px;padding:9px 12px;border:2px solid ${C};border-radius:6px;display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:${C}}
  .note{margin-top:18px;font-size:11px;color:#777;line-height:1.7}.office{margin-top:14px;text-align:right;font-size:12px;color:#333}
  @media print{body{margin:14mm}}</style></head><body>
  <h1>登記費用 概算（参考例）</h1><div class=date>${new Date().toLocaleDateString("ja-JP")} 作成</div>
  <div class=cond>${cond.filter(Boolean).join("　／　")}</div>
  ${block("買主様ご負担", est.buyer)}
  ${est.seller ? block("売主様ご負担", est.seller) : ""}
  <div class=note><b>※ 本書の報酬・登録免許税・実費は、入力いただいた評価額等に基づく計算例（一例）です。</b>実際の費用は物件・登記事項・評価証明書・契約内容の確認後に確定し、本書の金額と異なる場合があります。正式なお見積りは下記までご依頼ください。<br>
  ※ 登録免許税の税率は作成日時点の法令によります（土地売買15/1000は令和11年3月31日まで、住宅用家屋証明による軽減は令和9年3月31日まで）。</div>
  <div class=office>${CONFIG.officeName}${CONFIG.contact ? "　" + CONFIG.contact : ""}</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { alert("印刷ウィンドウを開けませんでした。ブラウザのポップアップ許可をご確認ください。"); return; }
  w.document.write(html); w.document.close();
}

function Summary({ title, s, accent, showSteps }) {
  const [open, setOpen] = useState(false);
  const steps = s.lines.flatMap((l) => (l.c.txd.steps || []).map((st) => ({ ...st, label: l.label })));
  const cell = "text-right text-sm align-top pl-2 whitespace-nowrap";
  return (
    <Card>
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold" style={{ color: "#1a2233" }}>{title}の内訳</h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#92400e" }}>金額は一例です</span>
      </div>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "#f6f8fc" }}>
          <th className="text-left text-[11px] font-bold py-2 px-2 rounded-l-lg" style={{ color: "#566275" }}>内容</th>
          <th className={`${cell} text-[11px] font-bold py-2`} style={{ color: "#566275" }}>報酬</th>
          <th className={`${cell} text-[11px] font-bold py-2 pr-2 rounded-r-lg`} style={{ color: "#b45309" }}>登録免許税・実費</th>
        </tr></thead>
        <tbody>
          {s.lines.map((l, i) => { const Ic = lineIcon(l.it); return (
            <tr key={`l${i}`} style={{ borderBottom: "1px solid #edf0f5" }}>
              <td className="py-2.5 px-2 align-top">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center rounded-md" style={{ width: 26, height: 26, background: "#eef2ff", color: C, marginTop: 1 }}><Ic width={15} height={15} /></span>
                  <div>
                    <div className="text-sm" style={{ color: "#1a2233" }}>{l.label}</div>
                    <div className="text-[11px]" style={{ color: "#8393a7" }}>基本 {fmt(l.c.fb)}{l.c.ep > 0 && ` ＋ 不動産加算 ${fmt(l.c.ep)}`}{l.addSc > 0 && ` ＋ 区分建物 ${fmt(l.addSc)}`}</div>
                  </div>
                </div>
              </td>
              <td className={`${cell} py-2.5`} style={{ fontVariantNumeric: "tabular-nums", color: "#1a2233" }}>{fmt(l.fee)}</td>
              <td className={`${cell} py-2.5 pr-2`} style={{ fontVariantNumeric: "tabular-nums", color: "#b45309" }}>{fmt(l.tax)}</td>
            </tr>); })}
          {s.jippi.map((j, i) => { const Ic = /郵送/.test(j.name) ? I.mail : I.doc; return (
            <tr key={`j${i}`} style={{ borderBottom: "1px solid #edf0f5" }}>
              <td className="py-2.5 px-2 align-top">
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center rounded-md" style={{ width: 26, height: 26, background: "#f3f4f6", color: "#6b7689" }}><Ic width={15} height={15} /></span>
                  <span className="text-sm" style={{ color: "#1a2233" }}>{j.name}</span>
                </div>
              </td>
              <td className={`${cell} py-2.5`} style={{ fontVariantNumeric: "tabular-nums", color: "#1a2233" }}>{j.fee > 0 ? fmt(j.fee) : "—"}</td>
              <td className={`${cell} py-2.5 pr-2`} style={{ fontVariantNumeric: "tabular-nums", color: "#b45309" }}>{j.jippi > 0 ? fmt(j.jippi) : "—"}</td>
            </tr>); })}
        </tbody>
      </table>
      <div className="mt-1">
        <Row label="報酬（税抜）" value={fmt(s.feeExcl)} />
        <Row label={`消費税（${CONFIG.taxRate}%）`} value={fmt(s.consumptionTax)} sub />
        <div className="rounded-lg px-2 -mx-2" style={{ background: "#f6f8fc" }}><Row label="報酬（税込）" value={fmt(s.feeIncl)} bold /></div>
        <Row label="登録免許税" value={fmt(s.regTax)} color="#b45309" />
        {s.jippiTotal > 0 && <Row label="実費（非課税）" value={fmt(s.jippiTotal)} color="#b45309" />}
      </div>
      <div className="flex justify-between items-baseline mt-3 pt-3" style={{ borderTop: `2px solid ${accent}` }}>
        <span className="font-bold" style={{ color: "#1a2233" }}>{title} 合計</span>
        <span className="text-2xl font-bold" style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>{fmt(s.grand)}</span>
      </div>
      {showSteps && steps.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setOpen(!open)} className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: open ? "#fef3c7" : "#f6f8fc", color: open ? "#92400e" : "#566275", border: "1px solid " + (open ? "#fde68a" : "#e3e8f0") }}>
            {open ? "▲ 登録免許税の計算過程を閉じる" : "▼ 登録免許税の計算過程"}
          </button>
          {open && (
            <div className="p-3 rounded-lg mt-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              {steps.map((st, i) => (
                <div key={i} className="mb-1 text-xs" style={{ color: "#78350f", fontVariantNumeric: "tabular-nums" }}>
                  <span className="font-medium" style={{ color: "#92400e" }}>{st.label}／{st.l}：</span>{st.v}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// 合計を示すヒーローカード（背景は街並みのシルエット）
// 合計を示すヒーローカード。public/hero.jpg があれば写真を背景に敷き、なければグラデーションのみ
const HERO_URL = ((import.meta.env && import.meta.env.BASE_URL) || "/") + "hero.jpg";
function Hero({ est, hasInput }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 mb-4" style={{
      background: `linear-gradient(95deg,${C} 0%,rgba(67,56,202,0.96) 34%,rgba(67,56,202,0.62) 62%,rgba(67,56,202,0.30) 100%), url(${HERO_URL}) right center / cover no-repeat, linear-gradient(135deg,${C} 0%,#3b3aa8 55%,#2f2f8f 100%)`,
      color: "#fff", textShadow: "0 1px 3px rgba(30,27,100,0.55)", boxShadow: "0 10px 28px rgba(67,56,202,0.32)" }}>
      <div className="relative flex items-start gap-3">
        <span className="flex-shrink-0 flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)" }}><I.calc width={24} height={24} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.78)" }}>買主様ご負担 概算合計（報酬税込＋登録免許税＋実費）</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#fde68a", color: "#78350f", textShadow: "none" }}>金額は一例</span>
          </div>
          <div className="font-bold mt-1" style={{ fontSize: 36, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{fmt(est.buyer.grand)}</div>
          <div className="flex gap-x-4 gap-y-1 mt-2 text-xs flex-wrap" style={{ color: "rgba(255,255,255,0.88)" }}>
            <span>報酬（税込） <b>{fmt(est.buyer.feeIncl)}</b></span>
            <span>登録免許税 <b>{fmt(est.buyer.regTax)}</b></span>
            {est.buyer.jippiTotal > 0 && <span>実費 <b>{fmt(est.buyer.jippiTotal)}</b></span>}
          </div>
          {!hasInput && <div className="text-xs mt-2.5 inline-block px-2 py-1 rounded-md" style={{ background: "rgba(253,230,138,0.18)", color: "#fde68a" }}>評価額を入力すると金額が更新されます</div>}
        </div>
      </div>
      <div className="relative text-[11px] mt-3 text-right" style={{ color: "rgba(255,255,255,0.85)" }}>登記で、次の一歩を。</div>
    </div>
  );
}

export default function Estimate() {
  const [inp, setInp] = useState(DEFAULT_INPUT);
  const u = (p) => setInp((s) => ({ ...s, ...p }));
  const est = useMemo(() => buildEstimate(inp), [inp]);
  const hasInput = est.land > 0 || est.bld > 0;
  const contactHref = "mailto:" + CONFIG.contactEmail
    + "?subject=" + encodeURIComponent("【登記費用シミュレーター】正式見積・カスタマイズの相談")
    + "&body=" + encodeURIComponent("会社名：\nご担当者名：\nお電話：\n\nご相談内容（正式見積 / 専用画面 / 案件テンプレート / eKYC / 電子署名 / オンライン申請 など）：\n\n"
      + (hasInput ? `\n――― シミュレーター入力内容 ―――\n土地 評価額：${est.land.toLocaleString()}円\n建物 評価額：${est.bld.toLocaleString()}円\n不動産の個数：${est.propCount}個${inp.kubun ? "（区分建物）" : ""}\n住宅用家屋証明書：${{ none: "なし", general: "一般住宅", premium: "長期優良・低炭素" }[inp.housingCert]}\n${inp.hasLoan ? `抵当権設定 債権額：${est.loan.toLocaleString()}円\n` : ""}買主負担 概算合計：${est.buyer.grand.toLocaleString()}円\n` : ""));

  return (
    <main className="mx-auto px-4 py-6" style={{ maxWidth: 1100 }}>
      <style>{`
        .est-grid{display:grid;grid-template-columns:1fr;gap:24px;align-items:start}
        @media(min-width:900px){.est-grid{grid-template-columns:1fr 1fr}.est-sticky{position:sticky;top:84px}}
        .est-details>summary{list-style:none}.est-details>summary::-webkit-details-marker{display:none}.est-details>summary::before{content:'▶';font-size:9px;margin-right:6px;display:inline-block;transition:transform .15s}.est-details[open]>summary::before{transform:rotate(90deg)}
        .est-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238393a7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
      `}</style>

      <div className="est-grid">
        {/* ── 入力 ── */}
        <div style={{ minWidth: 0 }}>
          <Card>
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: "#eef2ff", color: C }}>
              <I.home width={16} height={16} />
              <span className="text-xs font-bold">売買による所有権移転登記（中古住宅・土地）の概算</span>
            </div>

            <Step n={1} title="固定資産税評価額を入力" sub="固定資産評価証明書・課税明細の価格をご入力ください。" />
            <div className="p-4 rounded-xl mb-5" style={{ background: "#f3f6fc", border: "1px solid #dbe4f3" }}>
              <YenInput label="土地の評価額（合計）" help="固定資産評価証明書または固定資産税の課税明細書に記載の「価格（評価額）」です。複数筆ある場合はすべて合計して入力してください。" value={inp.landValue} onChange={(v) => u({ landValue: v })} placeholder="例: 10,000,000" note="複数筆はすべて合計して入力" />
              <YenInput label="建物の評価額（合計）" help="固定資産評価証明書または課税明細書に記載の建物の「価格（評価額）」です。建物のない土地のみの取引は空欄のままにしてください。" value={inp.buildingValue} onChange={(v) => u({ buildingValue: v })} placeholder="例: 5,000,000" note="建物がない土地のみの取引は空欄" />
              <div className="text-[11px] leading-relaxed" style={{ color: "#4b5a75" }}>※ 区分建物（マンション）の敷地は、敷地全体の評価額に敷地権割合を掛けた金額を土地欄に入れてください。</div>
            </div>

            <Step n={2} title="物件・ローンの条件" sub="該当するものを選択してください。" />
            <div className="grid grid-cols-2 gap-x-4 mb-1">
              <div className="mb-3">
                <Label hint="土地の筆数＋建物の個数">不動産の個数</Label>
                <div className="flex items-center gap-2">
                  <button onClick={() => u({ propCount: Math.max(1, (Number(inp.propCount) || 1) - 1) })} className="w-10 h-10 rounded-lg text-lg flex-shrink-0" style={{ background: "#f3f6fc", border: "1px solid #dbe4f3", color: "#3a4557" }}>−</button>
                  <input type="number" inputMode="numeric" min={1} value={inp.propCount}
                    onChange={(e) => u({ propCount: e.target.value === "" ? "" : Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                    onFocus={focus} onBlur={blur} className="w-full px-2 py-2 rounded-lg text-base outline-none text-center" style={{ ...inputStyle, minWidth: 0 }} />
                  <button onClick={() => u({ propCount: (Number(inp.propCount) || 0) + 1 })} className="w-10 h-10 rounded-lg text-lg flex-shrink-0" style={{ background: "#f3f6fc", border: "1px solid #dbe4f3", color: "#3a4557" }}>＋</button>
                </div>
              </div>
              <div className="mb-3">
                <Label help="買主が自ら居住する住宅で、床面積50㎡以上・新耐震基準適合（または昭和57年以降の建築）などの要件を満たすと、建物の登録免許税と抵当権設定の税率が軽減されます。市区町村が発行します。">住宅用家屋証明書</Label>
                <select value={inp.housingCert} onChange={(e) => u({ housingCert: e.target.value })} className="est-select w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer" style={{ ...inputStyle, height: 40 }}>
                  <option value="none">なし（原則税率）</option>
                  <option value="general">あり：一般住宅</option>
                  <option value="premium">あり：長期優良・低炭素</option>
                </select>
              </div>
            </div>

            <Toggle label="区分建物（マンション）" sub="区分建物加算 ＋5,000円" checked={inp.kubun} onChange={(v) => u({ kubun: v })} color="#f59e0b" />
            <Toggle label="住宅ローンあり（抵当権設定）" sub="借入額をもとに報酬・登録免許税を計算" checked={inp.hasLoan} onChange={(v) => u({ hasLoan: v })} />
            {inp.hasLoan && (
              <div className="p-4 rounded-xl mt-1 mb-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <YenInput label="債権額（借入額）" value={inp.loanAmount} onChange={(v) => u({ loanAmount: v })} placeholder="例: 30,000,000" />
              </div>
            )}

            <details className="mt-3 est-details">
              <summary className="text-xs cursor-pointer select-none font-medium" style={{ color: C }}>売主側の登記も見る（任意）</summary>
              <div className="mt-2 pl-1">
                <Toggle label="抵当権抹消" sub="売主のローン完済に伴う抹消" checked={inp.sellerDeletion} onChange={(v) => u({ sellerDeletion: v })} color="#6b7280" />
                <Toggle label="登記名義人住所変更" sub="売主の現住所が登記と異なる場合" checked={inp.sellerAddress} onChange={(v) => u({ sellerAddress: v })} color="#6b7280" />
              </div>
            </details>
          </Card>
        </div>

        {/* ── 結果 ── */}
        <div className="est-sticky" style={{ minWidth: 0 }}>
          <Hero est={est} hasInput={hasInput} />
          <Summary title="買主様ご負担" s={est.buyer} accent={C} showSteps />
          {est.seller && <Summary title="売主様ご負担" s={est.seller} accent="#6b7280" />}

          <button onClick={() => openPrint(inp, est)} disabled={!hasInput}
            className="w-full py-3 rounded-xl text-sm font-bold mb-4 flex items-center justify-center gap-2"
            style={{ background: "#fff", color: hasInput ? C : "#a0aec0", border: `1.5px solid ${hasInput ? "#c7d2fe" : "#e3e8f0"}`, cursor: hasInput ? "pointer" : "default", boxShadow: hasInput ? "0 2px 8px rgba(67,56,202,0.10)" : "none" }}>
            <I.print width={18} height={18} /> 概算書（参考例）を印刷・PDF保存
          </button>

          <div className="flex gap-2.5 rounded-xl p-3.5" style={{ background: "#eef4ff", border: "1px solid #d6e2fb" }}>
            <span className="flex-shrink-0" style={{ color: "#3b82f6", marginTop: 1 }}><I.info width={16} height={16} /></span>
            <div className="text-[11px] leading-relaxed" style={{ color: "#3a4a66" }}>
              <b style={{ color: "#1e3a8a" }}>※ この画面に表示される報酬・登録免許税・実費は、入力内容に基づく計算例（一例）です。</b>実際の費用は物件・登記事項・評価証明書・契約内容の確認後に確定し、表示額と異なる場合があります。正式なお見積りは{CONFIG.officeName}までご依頼ください。<br />
              ※ 登録免許税の税率：土地売買15/1000は令和11年3月31日まで、住宅用家屋証明による軽減は令和9年3月31日まで。<br />
              ※ 相続・贈与・根抵当権・敷地権の細かな按分など、この画面で扱えない案件は{CONFIG.officeName}までお問い合わせください。{CONFIG.contact && <>（{CONFIG.contact}）</>}
            </div>
          </div>
        </div>
      </div>

      {/* ── 正式見積・カスタマイズの相談 ── */}
      <section className="rounded-2xl p-5 mt-6" style={{ background: "#fff", border: "1.5px solid #c7d2fe", boxShadow: "0 4px 16px rgba(67,56,202,0.10)" }}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold mb-1" style={{ color: "#1a2233" }}>このシミュレーターは一例です。</div>
            <p className="text-xs leading-relaxed" style={{ color: "#3a4557" }}>
              御社の案件パターン・報酬体系に合わせた専用画面のほか、案件テンプレート、eKYC、電子署名、オンライン申請まで、御社の業務フローに合わせて設計できます。正式なお見積りのご依頼もこちらから。
            </p>
          </div>
          <a href={contactHref} className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg,${C},#3730a3)`, boxShadow: "0 6px 16px rgba(67,56,202,0.28)", textDecoration: "none" }}>
            <I.mail width={18} height={18} /> 正式見積・御社向けカスタマイズを相談する
          </a>
        </div>
        <div className="text-[11px] mt-2 md:text-right" style={{ color: "#8393a7" }}>{CONFIG.officeName}　{CONFIG.contactEmail}</div>
      </section>
    </main>
  );
}
