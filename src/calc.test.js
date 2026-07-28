// src/calc.test.js — 計算ロジックの自動テスト（Node標準テストランナー: `npm test`）
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  f1, f2, lk, IX, DEF_FT, DEF_UNIT, DEF_STD_ITEMS,
  calcTaxDetail, calcItem, fmt, fmtM, itemLabel,
  getExpList, getXFee, buildFeeRows, buildMeisai, meisaiToTSV,
} from "./calc.js";

// ───────── 端数処理 ─────────
test("f1: 千円未満切捨・最低1,000", () => {
  assert.equal(f1(0), 1000);
  assert.equal(f1(999), 1000);
  assert.equal(f1(1000), 1000);
  assert.equal(f1(1999), 1000);
  assert.equal(f1(2500), 2000);
  assert.equal(f1(12345678), 12345000);
});

test("f2: 百円未満切捨・0なら0・正なら最低1,000", () => {
  assert.equal(f2(0), 0);
  assert.equal(f2(-100), 0);
  assert.equal(f2(50), 1000);
  assert.equal(f2(999), 1000);
  assert.equal(f2(1250), 1200);
  assert.equal(f2(123456), 123400);
});

// ───────── 既定の標準項目 ─────────
test("デフォルト標準項目: 登記事項証明書 1,000/600・登記情報 500/330", () => {
  const cert = DEF_STD_ITEMS.find((s) => s.id === "cert");
  const info = DEF_STD_ITEMS.find((s) => s.id === "info");
  assert.equal(cert.fee, 1000);
  assert.equal(cert.jippi, 600);
  assert.equal(info.fee, 500);
  assert.equal(info.jippi, 330);
});

// ───────── 報酬テーブル参照 ─────────
test("lk: 上限以下の最初の行 / 0以下は0 / 範囲外は最終行", () => {
  assert.equal(lk(DEF_FT, 0, IX.IN), 0);
  assert.equal(lk(DEF_FT, 1000, IX.IN), 77000); // row0 移転(設定無)
  assert.equal(lk(DEF_FT, 1000, IX.IS), 62000); // row0 移転(設定有)
  assert.equal(lk(DEF_FT, 1500, IX.IN), 82000); // row1
  assert.equal(lk(DEF_FT, 999999, IX.IN), 380000); // 最終行
});

// ───────── 登録免許税 ─────────
test("登免税: 売買（土地15/1000・建物20/1000）", () => {
  const it = { causeType: "sale", landValue: 10000000, buildingValue: 5000000 };
  assert.equal(calcTaxDetail("transfer", it, "none").total, 250000);
});

test("登免税: 売買＋一般住宅（建物3/1000）", () => {
  const it = { causeType: "sale", landValue: 10000000, buildingValue: 5000000 };
  assert.equal(calcTaxDetail("transfer", it, "general").total, 165000);
});

test("登免税: 売買＋長期優良/低炭素（建物1/1000）", () => {
  const it = { causeType: "sale", landValue: 10000000, buildingValue: 5000000 };
  assert.equal(calcTaxDetail("transfer", it, "premium").total, 155000);
});

test("登免税: 相続4/1000・贈与等20/1000", () => {
  assert.equal(calcTaxDetail("transfer", { causeType: "inheritance", landValue: 10000000, buildingValue: 0 }, "none").total, 40000);
  assert.equal(calcTaxDetail("transfer", { causeType: "gift", landValue: 10000000, buildingValue: 0 }, "none").total, 200000);
});

test("登免税: 保存 4/1000・一般1.5/1000・長期1/1000", () => {
  const it = { taxableValue: 10000000 };
  assert.equal(calcTaxDetail("preservation", it, "none").total, 40000);
  assert.equal(calcTaxDetail("preservation", it, "general").total, 15000);
  assert.equal(calcTaxDetail("preservation", it, "premium").total, 10000);
});

test("登免税: 抵当権設定 4/1000・住宅証明で1/1000", () => {
  const it = { debtAmount: 30000000 };
  assert.equal(calcTaxDetail("mortgage", it, "none").total, 120000);
  assert.equal(calcTaxDetail("mortgage", it, "general").total, 30000);
  assert.equal(calcTaxDetail("mortgage", it, "premium").total, 30000);
});

test("登免税: 根抵当権設定 4/1000（軽減なし）", () => {
  const it = { debtAmount: 30000000 };
  assert.equal(calcTaxDetail("rootMortgage", it, "none").total, 120000);
  assert.equal(calcTaxDetail("rootMortgage", it, "premium").total, 120000);
});

test("登免税: 抹消 1個1,000円・上限20,000", () => {
  assert.equal(calcTaxDetail("deletion", { propCount: 3 }, "none").total, 3000);
  assert.equal(calcTaxDetail("deletion", { propCount: 25 }, "none").total, 20000);
});

test("登免税: 住所変更 1個1,000円（上限なし）", () => {
  assert.equal(calcTaxDetail("addressChange", { propCount: 2 }, "none").total, 2000);
  assert.equal(calcTaxDetail("addressChange", { propCount: 30 }, "none").total, 30000);
});

test("登免税: 評価額0でも最低1,000円（登免税法の最低額）", () => {
  assert.equal(calcTaxDetail("transfer", { causeType: "sale", landValue: 0, buildingValue: 0 }, "none").total, 1000);
});

test("登免税(売買): 土地のみ→建物側の幻の税額¥20が出ない", () => {
  const r = calcTaxDetail("transfer", { causeType: "sale", landValue: 3000000, buildingValue: 0 }, "none");
  assert.equal(r.total, 45000); // 3,000,000×15/1000、建物0円は不加算（旧: ¥20加算バグ）
  assert.equal(r.bt, 0);
});

// ───────── 報酬 calcItem ─────────
const G = (over = {}) => ({
  ft: DEF_FT, unit: DEF_UNIT, surcharges: [], enabledSc: {},
  housingCert: "none", hasTr: false, hasMtg: false, ...over,
});

test("calcItem: 移転（設定無）報酬＝テーブル＋不動産加算、登免税も同時算出", () => {
  const it = { type: "transfer", causeType: "sale", landValue: 10000000, buildingValue: 5000000, propCount: 2 };
  const r = calcItem(it, G({ hasMtg: false }));
  assert.equal(r.fb, 82000); // 1,500万区分 移転(設定無)
  assert.equal(r.ep, 2000); // 不動産加算 (2-1)*2,000
  assert.equal(r.fee, 84000);
  assert.equal(r.tax, 250000);
  assert.equal(r.col, "移転(設定無)");
});

test("calcItem: 移転（設定有）は抵当権同時でテーブル切替", () => {
  const it = { type: "transfer", causeType: "sale", landValue: 10000000, buildingValue: 0, propCount: 1 };
  const r = calcItem(it, G({ hasMtg: true }));
  assert.equal(r.fb, 62000); // 1,000万区分 移転(設定有)
  assert.equal(r.col, "移転(設定有)");
});

test("calcItem: 抵当権設定 移転同時=設定/単独=設定のみ で列が変わる", () => {
  const it = { type: "mortgage", debtAmount: 30000000, propCount: 1 };
  assert.equal(calcItem(it, G({ hasTr: true })).fb, 55600); // 3,000万 TS
  assert.equal(calcItem(it, G({ hasTr: false })).fb, 57600); // 3,000万 TO
  assert.equal(calcItem(it, G({ hasTr: true })).tax, 120000);
});

test("calcItem: 抹消＝基本12,000＋加算2,000/個、税は個数×1,000", () => {
  const r = calcItem({ type: "deletion", propCount: 3 }, G());
  assert.equal(r.fb, 12000);
  assert.equal(r.ep, 4000);
  assert.equal(r.fee, 16000);
  assert.equal(r.tax, 3000);
  assert.equal(r.isSimpleType, true);
});

test("calcItem: 住所変更＝基本12,000＋加算、税は個数×1,000", () => {
  const r = calcItem({ type: "addressChange", propCount: 2 }, G());
  assert.equal(r.fb, 12000);
  assert.equal(r.ep, 2000);
  assert.equal(r.fee, 14000);
  assert.equal(r.tax, 2000);
});

test("calcItem: feeに加算(surcharge)は含めない（表示側で項目#1に加算）", () => {
  const it = { type: "transfer", causeType: "sale", landValue: 10000000, buildingValue: 0, propCount: 1 };
  const g = G({ hasMtg: false, surcharges: [{ id: "kubun", name: "区分建物", amount: 5000 }], enabledSc: { kubun: true } });
  const r = calcItem(it, g);
  assert.equal(r.sc, 5000);
  assert.equal(r.fee, 77000); // fb(77,000)+ep(0)。scは別
});

// ───────── フォーマッタ ─────────
test("fmt: 円表記・0/NaN/nullは¥0", () => {
  assert.equal(fmt(0), "¥0");
  assert.equal(fmt(null), "¥0");
  assert.equal(fmt(NaN), "¥0");
  assert.equal(fmt(1234567), "¥1,234,567");
});

test("fmtM: 万円・億円表記", () => {
  assert.equal(fmtM(0), "");
  assert.equal(fmtM(5000), "5,000万円");
  assert.equal(fmtM(10000), "1億円");
  assert.equal(fmtM(12345), "1億2,345万円");
  assert.equal(fmtM(20000), "2億円");
});

test("itemLabel: 種別ラベル・債権額/極度額付き", () => {
  assert.equal(itemLabel({ type: "transfer" }), "所有権移転");
  assert.equal(itemLabel({ type: "deletion" }), "（根）抵当権抹消");
  assert.equal(itemLabel({ type: "mortgage", debtAmount: 30000000 }), "抵当権設定（債権額3,000万円）");
  assert.equal(itemLabel({ type: "rootMortgage", debtAmount: 0 }), "根抵当権設定");
});

// ───────── 実費・報酬集計 ─────────
test("getXFee: 謄本/情報の報酬＋追加項目の報酬", () => {
  assert.equal(getXFee({ cert: 2, info: 1 }, DEF_STD_ITEMS, [{ fee: "3000" }, { fee: "" }]), 5500);
});

test("getExpList: 実費（謄本・郵送・追加）", () => {
  const list = getExpList({ cert: 2, info: 0 }, DEF_STD_ITEMS, 2400, [{ name: "出張日当", expense: "500" }]);
  assert.equal(list.length, 3);
  assert.deepEqual(list.map((x) => x.amount), [1200, 2400, 500]);
});

test("buildFeeRows: 明細行（謄本/郵送/追加。count0は除外）", () => {
  const rows = [
    { kind: "std", stdId: "cert", count: 2 },
    { kind: "std", stdId: "info", count: 0 },
    { kind: "postage", amount: 2400 },
    { kind: "extra", name: "日当", fee: "5000", expense: "1000" },
  ];
  const out = buildFeeRows(rows, DEF_STD_ITEMS);
  assert.equal(out.length, 3);
  assert.deepEqual(out[0], { name: "登記事項証明書 2通", fee: 2000, jippi: 1200 });
  assert.deepEqual(out[1], { name: "郵送費", fee: 0, jippi: 2400 });
  assert.deepEqual(out[2], { name: "日当", fee: 5000, jippi: 1000 });
});

// ───────── ご請求明細・コピー用TSV ─────────
const MEISAI_ITEMS = [
  { type: "transfer", causeType: "sale", landValue: 10000000, buildingValue: 5000000, propCount: 2 },
  { type: "mortgage", debtAmount: 30000000, propCount: 1 },
];
const MEISAI_ROWS = [
  { kind: "std", stdId: "cert", count: 2 },
  { kind: "std", stdId: "info", count: 0 },
  { kind: "postage", amount: 2400 },
];

test("buildMeisai: 明細行と合計（報酬・消費税・登免税・実費・合計請求額）", () => {
  const g = G({ hasTr: true, hasMtg: true, counts: { cert: 2 }, stdItems: DEF_STD_ITEMS });
  const m = buildMeisai(MEISAI_ITEMS, g, 0, MEISAI_ROWS, DEF_STD_ITEMS, 10);
  assert.equal(m.regLines.length, 2);
  assert.equal(m.regFee, 79000 + 55600); // 移転(設定有)1,500万=77,000+不動産加算2,000 / 抵当権設定3,000万=55,600
  assert.equal(m.otherFee, 2000); // 登記事項証明書 2通
  assert.equal(m.feeExcl, 136600);
  assert.equal(m.consumptionTax, 13660);
  assert.equal(m.feeIncl, 150260);
  assert.equal(m.regTax, 250000 + 120000);
  assert.equal(m.jippiTotal, 1200 + 2400);
  assert.equal(m.grand, 150260 + 370000 + 3600);
});

test("buildMeisai: 加算(scTotal)は先頭の取引項目にだけ乗る", () => {
  const g = G({ hasTr: true, hasMtg: true, counts: {}, stdItems: DEF_STD_ITEMS });
  const m = buildMeisai(MEISAI_ITEMS, g, 5000, [], DEF_STD_ITEMS, 10);
  assert.equal(m.regLines[0].addSc, 5000);
  assert.equal(m.regLines[1].addSc, 0);
  assert.equal(m.regFee, 79000 + 5000 + 55600);
});

test("meisaiToTSV: タブ区切り・数値は桁区切りなしの生の数字", () => {
  const g = G({ hasTr: true, hasMtg: true, counts: { cert: 2 }, stdItems: DEF_STD_ITEMS });
  const tsv = meisaiToTSV(buildMeisai(MEISAI_ITEMS, g, 0, MEISAI_ROWS, DEF_STD_ITEMS, 10), 10);
  const lines = tsv.split("\n");
  assert.equal(lines[0], "項目\t報酬\t登免税・実費");
  assert.equal(lines[1], "所有権移転\t79000\t250000");
  assert.equal(lines[2], "抵当権設定（債権額3,000万円）\t55600\t120000");
  assert.equal(lines[3], "登記事項証明書 2通\t2000\t1200");
  assert.equal(lines[4], "郵送費\t0\t2400");
  assert.equal(lines[5], "報酬（税抜）\t136600");
  assert.equal(lines[6], "消費税（10%）\t13660");
  assert.equal(lines[7], "報酬（税込）\t150260");
  assert.equal(lines[8], "登録免許税\t370000");
  assert.equal(lines[9], "実費・立替金\t3600");
  assert.equal(lines[10], "合計請求額\t523860");
  assert.equal(lines.length, 11);
  assert.ok(!tsv.includes("¥"), "金額に¥を含めない（貼り付け先で数値として扱えるように）");
});

test("meisaiToTSV: 実費0のときは実費行を出さない", () => {
  const g = G({ hasTr: true, counts: {}, stdItems: DEF_STD_ITEMS });
  const tsv = meisaiToTSV(buildMeisai([MEISAI_ITEMS[0]], g, 0, [], DEF_STD_ITEMS, 10), 10);
  assert.ok(!tsv.includes("実費・立替金"));
});
