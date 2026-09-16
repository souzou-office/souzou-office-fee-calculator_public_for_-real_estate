// src/Estimate.jsx — 不動産会社向け 登記費用 概算シミュレーター（1画面）
// 固定資産税評価額などを入れるだけで、買主負担（報酬＋登録免許税＋実費）の概算が出る。
// 報酬テーブル・単価は calc.js の既定値を固定で使い、画面からの設定変更はできない。
import { useMemo, useState } from "react";
import { fmt, fmtM } from "./calc";
import { buildEstimate, DEFAULT_INPUT } from "./estimate";
import { CONFIG } from "./estimateConfig";

const C = "#4338ca";
const inputStyle = { background: "#f0f3f8", border: "1.5px solid #dce1ea", color: "#1a2233", fontVariantNumeric: "tabular-nums" };
const focus = (e) => { e.target.style.borderColor = C; e.target.style.background = "#fff"; };
const blur = (e) => { e.target.style.borderColor = "#dce1ea"; e.target.style.background = "#f0f3f8"; };

function Label({ children, hint }) {
  return (
    <label className="block text-xs font-medium mb-1" style={{ color: "#566275" }}>
      {children}{hint && <span className="ml-1 font-normal" style={{ color: "#8393a7" }}>{hint}</span>}
    </label>
  );
}
function YenInput({ label, hint, value, onChange, placeholder, note }) {
  const n = Number(value) || 0;
  return (
    <div className="mb-3">
      <Label hint={hint}>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="number" inputMode="numeric" min={0} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          onFocus={focus} onBlur={blur}
          className="w-full px-3 py-2.5 rounded-lg text-base outline-none text-right" style={inputStyle} />
        <span className="text-xs whitespace-nowrap flex-shrink-0" style={{ color: "#8393a7" }}>円</span>
      </div>
      <div className="text-xs mt-1 min-h-[1rem]" style={{ color: n > 0 ? C : "#a0aec0" }}>
        {n > 0 ? `${fmtM(Math.ceil(n / 10000))}` : note || ""}
      </div>
    </div>
  );
}
function Toggle({ label, checked, onChange, color = C, sub }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none py-1.5" onClick={(e) => { e.preventDefault(); onChange(!checked); }}>
      <div className="relative rounded-full transition-all flex-shrink-0" style={{ width: 38, height: 22, background: checked ? color : "#dce1ea" }}>
        <div className="absolute rounded-full bg-white shadow transition-all" style={{ width: 18, height: 18, top: 2, left: checked ? 18 : 2 }} />
      </div>
      <div>
        <div className="text-sm" style={{ color: checked ? "#1a2233" : "#3a4557", fontWeight: checked ? 700 : 500 }}>{label}</div>
        {sub && <div className="text-xs" style={{ color: "#8393a7" }}>{sub}</div>}
      </div>
    </label>
  );
}
function Seg({ value, onChange, options }) {
  return (
    <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className="py-3 px-2 rounded-xl text-sm font-bold transition-all"
          style={value === o.value
            ? { background: `linear-gradient(135deg,${C},#3730a3)`, color: "#fff", boxShadow: "0 4px 12px rgba(67,56,202,0.25)" }
            : { background: "#fff", color: "#566275", border: "1.5px solid #dce1ea" }}>
          <div>{o.label}</div>
          {o.sub && <div className="text-[11px] font-normal mt-0.5" style={{ opacity: 0.8 }}>{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}
const Row = ({ label, value, sub, bold, hl, color }) => (
  <div className="flex justify-between items-baseline gap-3 py-1.5" style={{ borderBottom: "1px solid #edf0f5" }}>
    <span className={`text-sm ${bold ? "font-bold" : ""}`} style={{ color: sub ? "#8393a7" : (color || "#3a4557"), paddingLeft: sub ? 12 : 0 }}>{label}</span>
    <span className={`text-sm whitespace-nowrap ${bold ? "font-bold" : "font-medium"}`} style={{ color: hl ? C : (color || "#1a2233"), fontVariantNumeric: "tabular-nums" }}>{value}</span>
  </div>
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
  <h1>登記費用 概算</h1><div class=date>${new Date().toLocaleDateString("ja-JP")} 作成</div>
  <div class=cond>${cond.filter(Boolean).join("　／　")}</div>
  ${block("買主様ご負担", est.buyer)}
  ${est.seller ? block("売主様ご負担", est.seller) : ""}
  <div class=note>※ 本書は入力いただいた評価額等に基づく概算です。実際の費用は登記事項・評価証明書・契約内容の確認後に確定します。<br>
  ※ 登録免許税の税率は作成日時点の法令によります（土地売買15/1000は令和8年3月31日まで、住宅用家屋証明による軽減は令和9年3月31日まで）。</div>
  <div class=office>${CONFIG.officeName}${CONFIG.contact ? "　" + CONFIG.contact : ""}</div>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { alert("印刷ウィンドウを開けませんでした。ブラウザのポップアップ許可をご確認ください。"); return; }
  w.document.write(html); w.document.close();
}

function Summary({ title, s, accent, showSteps }) {
  const [open, setOpen] = useState(false);
  const steps = s.lines.flatMap((l) => (l.c.txd.steps || []).map((st) => ({ ...st, label: l.label })));
  return (
    <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: `1.5px solid ${accent}33`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: accent }}>{title}</h3>
        <span className="text-xs" style={{ color: "#8393a7" }}>概算</span>
      </div>
      <table className="w-full mb-2" style={{ borderCollapse: "collapse" }}>
        <thead><tr style={{ borderBottom: "1.5px solid #dce1ea" }}>
          <th className="text-left text-xs font-bold pb-1.5" style={{ color: "#8393a7" }}>内容</th>
          <th className="text-right text-xs font-bold pb-1.5 pl-2 whitespace-nowrap" style={{ color: "#8393a7" }}>報酬</th>
          <th className="text-right text-xs font-bold pb-1.5 pl-2 whitespace-nowrap" style={{ color: "#b45309" }}>登免税・実費</th>
        </tr></thead>
        <tbody>
          {s.lines.map((l, i) => (
            <tr key={`l${i}`} style={{ borderBottom: "1px solid #edf0f5" }}>
              <td className="py-1.5 align-top">
                <div className="text-sm" style={{ color: "#1a2233" }}>{l.label}</div>
                <div className="text-[11px]" style={{ color: "#8393a7" }}>
                  基本 {fmt(l.c.fb)}{l.c.ep > 0 && `　＋不動産加算 ${fmt(l.c.ep)}`}{l.addSc > 0 && `　＋区分建物 ${fmt(l.addSc)}`}
                </div>
              </td>
              <td className="text-right text-sm align-top py-1.5 pl-2 whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(l.fee)}</td>
              <td className="text-right text-sm align-top py-1.5 pl-2 whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums", color: "#b45309" }}>{fmt(l.tax)}</td>
            </tr>
          ))}
          {s.jippi.map((j, i) => (
            <tr key={`j${i}`} style={{ borderBottom: "1px solid #edf0f5" }}>
              <td className="py-1.5 text-sm align-top" style={{ color: "#1a2233" }}>{j.name}</td>
              <td className="text-right text-sm align-top py-1.5 pl-2 whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums" }}>{j.fee > 0 ? fmt(j.fee) : "—"}</td>
              <td className="text-right text-sm align-top py-1.5 pl-2 whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums", color: "#b45309" }}>{j.jippi > 0 ? fmt(j.jippi) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Row label="報酬（税抜）" value={fmt(s.feeExcl)} />
      <Row label={`消費税（${CONFIG.taxRate}%）`} value={fmt(s.consumptionTax)} sub />
      <Row label="報酬（税込）" value={fmt(s.feeIncl)} bold />
      <Row label="登録免許税" value={fmt(s.regTax)} color="#b45309" />
      {s.jippiTotal > 0 && <Row label="実費（非課税）" value={fmt(s.jippiTotal)} color="#b45309" />}
      <div className="flex justify-between items-baseline mt-3 pt-3" style={{ borderTop: `2px solid ${accent}` }}>
        <span className="font-bold" style={{ color: "#1a2233" }}>{title} 合計</span>
        <span className="text-2xl font-bold" style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>{fmt(s.grand)}</span>
      </div>
      {showSteps && steps.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setOpen(!open)} className="text-xs px-2 py-1 rounded"
            style={{ background: open ? "#fef3c7" : "#f0f3f8", color: open ? "#92400e" : "#8393a7", border: "1px solid " + (open ? "#fde68a" : "#dce1ea") }}>
            {open ? "▲ 登録免許税の計算過程を閉じる" : "▼ 登録免許税の計算過程"}
          </button>
          {open && (
            <div className="p-2.5 rounded-lg mt-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              {steps.map((st, i) => (
                <div key={i} className="mb-1 text-xs" style={{ color: "#78350f", fontVariantNumeric: "tabular-nums" }}>
                  <span className="font-medium" style={{ color: "#92400e" }}>{st.label}／{st.l}：</span>{st.v}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Estimate() {
  const [inp, setInp] = useState(DEFAULT_INPUT);
  const u = (p) => setInp((s) => ({ ...s, ...p }));
  const est = useMemo(() => buildEstimate(inp), [inp]);
  const isTr = inp.regType !== "preservation";
  const hasInput = est.land > 0 || est.bld > 0;

  return (
    <main className="mx-auto px-4 py-6" style={{ maxWidth: 1100 }}>
      <style>{`
        .est-grid{display:grid;grid-template-columns:1fr;gap:24px;align-items:start}
        @media(min-width:900px){.est-grid{grid-template-columns:1fr 1fr}.est-sticky{position:sticky;top:80px}}
      `}</style>
      <div className="mb-5">
        <h1 className="text-lg font-bold" style={{ color: "#1a2233" }}>登記費用 概算シミュレーター</h1>
        <p className="text-xs mt-1" style={{ color: "#6b7689" }}>固定資産税評価額を入れるだけで、司法書士報酬・登録免許税・実費の概算が確認できます。見積依頼の前の目安としてご利用ください。</p>
      </div>

      <div className="est-grid">
        {/* ── 入力 ── */}
        <div style={{ minWidth: 0 }}>
          <div className="rounded-xl p-5 mb-4" style={{ background: "#fff", border: "1px solid #e5e9f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: C }}>1. 登記の内容</h2>
            <Seg value={inp.regType} onChange={(v) => u({ regType: v, propCount: v === "preservation" ? 1 : 2 })} options={[
              { value: "transfer", label: "売買（中古・土地）", sub: "所有権移転登記" },
              { value: "preservation", label: "新築", sub: "所有権保存登記" },
            ]} />

            <h2 className="text-sm font-bold mb-3" style={{ color: C }}>2. 固定資産税評価額</h2>
            <div className="p-3 rounded-lg mb-3" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              {isTr && <YenInput label="土地の評価額（合計）" hint="固定資産評価証明書・課税明細の価格" value={inp.landValue} onChange={(v) => u({ landValue: v })} placeholder="例: 10000000" note="複数筆はすべて合計して入力" />}
              <YenInput label={isTr ? "建物の評価額（合計）" : "建物の課税標準額"} hint={isTr ? "" : "新築は法務局の認定基準価格（評価額がまだない場合）"} value={inp.buildingValue} onChange={(v) => u({ buildingValue: v })} placeholder="例: 5000000" note={isTr ? "建物がない土地のみの取引は空欄" : ""} />
              <div className="text-xs" style={{ color: "#1e40af" }}>※ 区分建物（マンション）の敷地は、敷地全体の評価額に敷地権割合を掛けた金額を土地欄に入れてください。</div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 mb-2">
              <div className="mb-3">
                <Label hint="土地の筆数＋建物の個数">不動産の個数</Label>
                <div className="flex items-center gap-2">
                  <button onClick={() => u({ propCount: Math.max(1, (Number(inp.propCount) || 1) - 1) })} className="w-9 h-9 rounded-lg text-lg flex-shrink-0" style={{ background: "#f0f3f8", border: "1px solid #dce1ea", color: "#3a4557" }}>−</button>
                  <input type="number" inputMode="numeric" min={1} value={inp.propCount}
                    onChange={(e) => u({ propCount: e.target.value === "" ? "" : Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                    onFocus={focus} onBlur={blur} className="w-full px-2 py-2 rounded-lg text-base outline-none text-center" style={inputStyle} />
                  <button onClick={() => u({ propCount: (Number(inp.propCount) || 0) + 1 })} className="w-9 h-9 rounded-lg text-lg flex-shrink-0" style={{ background: "#f0f3f8", border: "1px solid #dce1ea", color: "#3a4557" }}>＋</button>
                  <span className="text-xs flex-shrink-0" style={{ color: "#8393a7" }}>個</span>
                </div>
              </div>
              <div className="mb-3">
                <Label>住宅用家屋証明書</Label>
                <select value={inp.housingCert} onChange={(e) => u({ housingCert: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer" style={{ ...inputStyle, appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238393a7'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                  <option value="none">なし（原則税率）</option>
                  <option value="general">あり：一般住宅</option>
                  <option value="premium">あり：長期優良・低炭素</option>
                </select>
                <div className="text-[11px] mt-1" style={{ color: "#8393a7" }}>買主が自ら居住・床面積50㎡以上・新耐震基準等の要件を満たす場合</div>
              </div>
            </div>

            <Toggle label="区分建物（マンション）" sub="区分建物加算 ＋5,000円" checked={inp.kubun} onChange={(v) => u({ kubun: v })} color="#f59e0b" />
            <Toggle label="住宅ローンあり（抵当権設定）" sub="借入額をもとに報酬・登録免許税を計算" checked={inp.hasLoan} onChange={(v) => u({ hasLoan: v })} />
            {inp.hasLoan && (
              <div className="p-3 rounded-lg mt-1 mb-2" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                <YenInput label="債権額（借入額）" value={inp.loanAmount} onChange={(v) => u({ loanAmount: v })} placeholder="例: 30000000" />
              </div>
            )}

            <details className="mt-3">
              <summary className="text-xs cursor-pointer select-none" style={{ color: "#6b7689" }}>売主側の登記も見る（任意）</summary>
              <div className="mt-2 pl-1">
                <Toggle label="抵当権抹消" sub="売主のローン完済に伴う抹消" checked={inp.sellerDeletion} onChange={(v) => u({ sellerDeletion: v })} color="#6b7280" />
                <Toggle label="登記名義人住所変更" sub="売主の現住所が登記と異なる場合" checked={inp.sellerAddress} onChange={(v) => u({ sellerAddress: v })} color="#6b7280" />
              </div>
            </details>
          </div>
        </div>

        {/* ── 結果 ── */}
        <div className="est-sticky" style={{ minWidth: 0 }}>
          <div className="rounded-xl p-5 mb-4" style={{ background: `linear-gradient(135deg,${C},#3730a3)`, color: "#fff", boxShadow: "0 4px 16px rgba(67,56,202,0.25)" }}>
            <div className="text-xs font-bold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>買主様ご負担 概算合計（報酬税込＋登録免許税＋実費）</div>
            <div className="text-3xl font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(est.buyer.grand)}</div>
            <div className="flex gap-4 mt-2 text-xs flex-wrap" style={{ color: "rgba(255,255,255,0.85)" }}>
              <span>報酬（税込） {fmt(est.buyer.feeIncl)}</span>
              <span>登録免許税 {fmt(est.buyer.regTax)}</span>
              {est.buyer.jippiTotal > 0 && <span>実費 {fmt(est.buyer.jippiTotal)}</span>}
            </div>
            {!hasInput && <div className="text-xs mt-2" style={{ color: "#fde68a" }}>← 評価額を入力すると金額が更新されます</div>}
          </div>

          <Summary title="買主様ご負担" s={est.buyer} accent={C} showSteps />
          {est.seller && <Summary title="売主様ご負担" s={est.seller} accent="#6b7280" />}

          <button onClick={() => openPrint(inp, est)} disabled={!hasInput}
            className="w-full py-3 rounded-xl text-sm font-bold mb-3"
            style={{ background: hasInput ? "#fff" : "#f0f3f8", color: hasInput ? C : "#a0aec0", border: `1.5px solid ${hasInput ? "#c7d2fe" : "#dce1ea"}`, cursor: hasInput ? "pointer" : "default" }}>
            🖨 概算書を印刷・PDF保存
          </button>

          <div className="text-[11px] leading-relaxed px-1" style={{ color: "#8393a7" }}>
            ※ 本シミュレーターの金額は概算です。実際の費用は登記事項・評価証明書・契約内容の確認後に確定します。<br />
            ※ 登録免許税の税率：土地売買15/1000は令和8年3月31日まで、住宅用家屋証明による軽減は令和9年3月31日まで。<br />
            ※ 相続・贈与・根抵当権・敷地権の細かな按分など、この画面で扱えない案件は{CONFIG.officeName}までお問い合わせください。{CONFIG.contact && <>（{CONFIG.contact}）</>}
          </div>
        </div>
      </div>
    </main>
  );
}
