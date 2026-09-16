// src/estimate.js — 不動産会社向け 概算シミュレーターの集計ロジック（UIから分離。テスト対象）
// 入力（評価額・個数・ローン等）から、既存の calc.js を使って
// 買主負担（移転/保存＋設定）と売主負担（抹消・住所変更）の概算をまとめて返す。
import { DEF_FT, DEF_UNIT, DEF_SURCHARGES, DEF_STD_ITEMS, calcItem, itemLabel } from "./calc.js";
import { CONFIG } from "./estimateConfig.js";

export const DEFAULT_INPUT = {
  regType: "transfer",      // transfer: 売買による所有権移転 / preservation: 新築の所有権保存
  landValue: "",            // 土地の固定資産税評価額（合計）
  buildingValue: "",        // 建物の固定資産税評価額（合計）。保存のときは法務局の認定基準による課税標準額
  propCount: 2,             // 不動産の個数（土地の筆数＋建物の個数）
  kubun: false,             // 区分建物（マンション）
  housingCert: "none",      // 住宅用家屋証明書: none / general / premium
  hasLoan: false,           // 住宅ローン（抵当権設定）あり
  loanAmount: "",           // 債権額（借入額）
  sellerDeletion: false,    // 売主側: 抵当権抹消
  sellerAddress: false,     // 売主側: 住所変更
};

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

function sumLines(lines, cfg, jippi) {
  const regFee = lines.reduce((s, l) => s + l.fee, 0);
  const regTax = lines.reduce((s, l) => s + l.tax, 0);
  const otherFee = jippi.reduce((s, j) => s + j.fee, 0);
  const jippiTotal = jippi.reduce((s, j) => s + j.jippi, 0);
  const feeExcl = regFee + otherFee;
  const consumptionTax = Math.floor(feeExcl * cfg.taxRate / 100);
  const feeIncl = feeExcl + consumptionTax;
  const grand = feeIncl + regTax + jippiTotal;
  return { lines, jippi, regFee, otherFee, feeExcl, consumptionTax, feeIncl, regTax, jippiTotal, grand };
}

export function buildEstimate(inp, cfg = CONFIG) {
  const pc = Math.max(1, Math.floor(Number(inp.propCount)) || 1);
  const land = num(inp.landValue), bld = num(inp.buildingValue), loan = num(inp.loanAmount);
  const isTransfer = inp.regType !== "preservation";

  // ── 買主側 ──
  const items = [];
  if (isTransfer) items.push({ type: "transfer", causeType: "sale", landValue: land, buildingValue: bld, propCount: pc });
  else items.push({ type: "preservation", taxableValue: bld, propCount: pc });
  if (inp.hasLoan) items.push({ type: "mortgage", debtAmount: loan, propCount: pc });

  const g = {
    ft: DEF_FT, unit: DEF_UNIT, surcharges: DEF_SURCHARGES,
    enabledSc: { kubun: !!inp.kubun }, housingCert: inp.housingCert || "none",
    hasTr: isTransfer, hasMtg: !!inp.hasLoan,
  };
  const surcharge = inp.kubun ? DEF_SURCHARGES.filter((s) => s.id === "kubun").reduce((s, x) => s + x.amount, 0) : 0;
  const buyerLines = items.map((it, i) => {
    const c = calcItem(it, g);
    const addSc = i === 0 ? surcharge : 0;
    return { it, c, label: itemLabel(it), fee: c.fee + addSc, addSc, tax: c.tax };
  });

  const jippi = [];
  const cert = DEF_STD_ITEMS.find((s) => s.id === "cert");
  if (cfg.certPerProperty && cert) jippi.push({ name: `${cert.name} ${pc}${cert.unitLabel}`, fee: cert.fee * pc, jippi: cert.jippi * pc });
  if (cfg.postage > 0) jippi.push({ name: "郵送費", fee: 0, jippi: cfg.postage });
  const buyer = sumLines(buyerLines, cfg, jippi);

  // ── 売主側（任意） ──
  const sellerItems = [];
  if (inp.sellerDeletion) sellerItems.push({ type: "deletion", propCount: pc });
  if (inp.sellerAddress) sellerItems.push({ type: "addressChange", propCount: pc });
  const sg = { ...g, enabledSc: {} };
  const sellerLines = sellerItems.map((it) => { const c = calcItem(it, sg); return { it, c, label: itemLabel(it), fee: c.fee, addSc: 0, tax: c.tax }; });
  const seller = sellerItems.length ? sumLines(sellerLines, cfg, []) : null;

  return { buyer, seller, propCount: pc, land, bld, loan, isTransfer, surcharge };
}
