// src/estimate.test.js — 概算シミュレーター集計のテスト（`npm test`）
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEstimate, DEFAULT_INPUT } from "./estimate.js";

const CFG = { officeName: "", contact: "", taxRate: 10, certPerProperty: true, postage: 2400 };
const inp = (over = {}) => ({ ...DEFAULT_INPUT, ...over });

test("売買（移転のみ）: 土地1,000万＋建物500万・2個", () => {
  const e = buildEstimate(inp({ landValue: 10000000, buildingValue: 5000000, propCount: 2 }), CFG);
  const b = e.buyer;
  assert.equal(b.lines.length, 1);
  assert.equal(b.lines[0].fee, 84000);      // 1,500万区分 移転(設定無)82,000 ＋ 不動産加算2,000
  assert.equal(b.lines[0].tax, 250000);     // 土地15/1000＋建物20/1000
  assert.equal(b.otherFee, 2000);           // 登記事項証明書 2通 × 1,000
  assert.equal(b.feeExcl, 86000);
  assert.equal(b.consumptionTax, 8600);
  assert.equal(b.feeIncl, 94600);
  assert.equal(b.jippiTotal, 1200 + 2400);  // 謄本実費 600×2 ＋ 郵送費
  assert.equal(b.grand, 94600 + 250000 + 3600);
  assert.equal(e.seller, null);
});

test("売買＋住宅ローン: 移転は設定有テーブル、抵当権は設定テーブル", () => {
  const e = buildEstimate(inp({ landValue: 10000000, buildingValue: 5000000, propCount: 2, hasLoan: true, loanAmount: 30000000 }), CFG);
  const [tr, mg] = e.buyer.lines;
  assert.equal(tr.fee, 77000 + 2000);       // 移転(設定有) 1,500万→2,000万区分 77,000
  assert.equal(mg.fee, 55600 + 2000);       // 抵当権設定 3,000万 55,600 ＋ 不動産加算
  assert.equal(mg.tax, 120000);             // 3,000万 × 4/1000
  assert.equal(e.buyer.regTax, 250000 + 120000);
});

test("住宅用家屋証明書（一般）: 建物3/1000・抵当権1/1000", () => {
  const e = buildEstimate(inp({ landValue: 10000000, buildingValue: 5000000, hasLoan: true, loanAmount: 30000000, housingCert: "general" }), CFG);
  assert.equal(e.buyer.lines[0].tax, 165000);
  assert.equal(e.buyer.lines[1].tax, 30000);
});

test("区分建物: 加算5,000は1行目の報酬にだけ乗る", () => {
  const e = buildEstimate(inp({ landValue: 10000000, buildingValue: 5000000, kubun: true, hasLoan: true, loanAmount: 30000000 }), CFG);
  assert.equal(e.surcharge, 5000);
  assert.equal(e.buyer.lines[0].addSc, 5000);
  assert.equal(e.buyer.lines[0].fee, 77000 + 2000 + 5000);
  assert.equal(e.buyer.lines[1].addSc, 0);
});

test("新築（保存）: 建物の課税標準額のみ・保存テーブル", () => {
  const e = buildEstimate(inp({ regType: "preservation", buildingValue: 10000000, propCount: 1 }), CFG);
  const l = e.buyer.lines[0];
  assert.equal(l.label, "所有権保存");
  assert.equal(l.fee, 30000);               // 1,000万区分 保存
  assert.equal(l.tax, 40000);               // 4/1000
  const g = buildEstimate(inp({ regType: "preservation", buildingValue: 10000000, propCount: 1, housingCert: "general" }), CFG);
  assert.equal(g.buyer.lines[0].tax, 15000); // 1.5/1000
});

test("新築（保存）＋ローン: 抵当権は『設定のみ』テーブル", () => {
  const e = buildEstimate(inp({ regType: "preservation", buildingValue: 10000000, propCount: 1, hasLoan: true, loanAmount: 30000000 }), CFG);
  assert.equal(e.buyer.lines[1].fee, 57600); // 抵当権(設定のみ) 3,000万
});

test("売主側: 抹消・住所変更は別集計（謄本・郵送費は付けない）", () => {
  const e = buildEstimate(inp({ landValue: 10000000, buildingValue: 5000000, propCount: 2, sellerDeletion: true, sellerAddress: true }), CFG);
  assert.ok(e.seller);
  assert.equal(e.seller.lines.length, 2);
  assert.equal(e.seller.lines[0].fee, 12000 + 2000);
  assert.equal(e.seller.lines[0].tax, 2000);
  assert.equal(e.seller.lines[1].fee, 12000 + 2000);
  assert.equal(e.seller.lines[1].tax, 2000);
  assert.equal(e.seller.jippiTotal, 0);
  assert.equal(e.seller.feeExcl, 28000);
  assert.equal(e.seller.grand, 28000 + 2800 + 4000);
});

test("設定で謄本・郵送費を外せる／個数は最低1", () => {
  const e = buildEstimate(inp({ landValue: 10000000, propCount: 0 }), { ...CFG, certPerProperty: false, postage: 0 });
  assert.equal(e.propCount, 1);
  assert.equal(e.buyer.jippi.length, 0);
  assert.equal(e.buyer.otherFee, 0);
  assert.equal(e.buyer.jippiTotal, 0);
});

test("未入力・不正値は0扱い（NaNにならない）", () => {
  const e = buildEstimate(inp({ landValue: "", buildingValue: "abc", loanAmount: -5, hasLoan: true }), CFG);
  assert.equal(e.land, 0);
  assert.equal(e.bld, 0);
  assert.equal(e.loan, 0);
  assert.ok(Number.isFinite(e.buyer.grand));
});
