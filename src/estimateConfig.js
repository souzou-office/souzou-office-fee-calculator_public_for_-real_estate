// src/estimateConfig.js — 不動産会社向け 概算シミュレーターの固定設定
// 事務所側で変えたい値はここだけ編集する（画面からは変更できない）。
// 報酬テーブル・不動産加算・区分建物加算などの単価は calc.js の既定値（DEF_FT / DEF_UNIT / DEF_SURCHARGES）を使う。
export const CONFIG = {
  officeName: "司法書士法人そうぞう",  // 画面下部・印刷物に表示する事務所名
  contact: "info@souzou-office.jp",   // 画面の注記・印刷物に表示する連絡先（空なら非表示）
  contactEmail: "info@souzou-office.jp", // 「正式見積・カスタマイズを相談する」ボタンの送信先
  taxRate: 10,                        // 消費税率（%）
  certPerProperty: true,              // 登記完了後の登記事項証明書を「不動産1個につき1通」自動計上する
  postage: 2400,                      // 郵送費（実費・円）。0なら計上しない
};
