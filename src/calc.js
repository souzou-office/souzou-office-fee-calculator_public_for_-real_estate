// src/calc.js — 報酬・登録免許税の計算ロジック（UIから分離。テスト対象）

const DEF_FT=[
[1000,62000,77000,30000,45000,47000,53000,55000],[2000,77000,82000,30000,50300,52300,58300,60300],
[3000,82000,97000,30000,55600,57600,63600,65600],[4000,97000,102000,33000,60900,62900,68900,70900],
[5000,102000,127000,36000,66200,68200,74200,76200],[6000,127000,132000,39000,71500,73500,79500,81500],
[7000,132000,137000,42000,76800,78800,84800,86800],[8000,137000,142000,45000,82100,84100,90100,92100],
[9000,142000,147000,48000,87400,89400,95400,97400],[10000,147000,170000,51000,92700,94700,100700,102700],
[11000,170000,173000,53000,95200,97200,103200,105200],[12000,173000,176000,55000,97700,99700,105700,107700],
[13000,176000,179000,57000,100200,102200,108200,110200],[14000,179000,182000,59000,102700,104700,110700,112700],
[15000,182000,185000,61000,105200,107200,113200,115200],[16000,185000,188000,63000,107700,109700,115700,117700],
[17000,188000,191000,65000,110200,112200,118200,120200],[18000,191000,194000,67000,112700,114700,120700,122700],
[19000,194000,197000,69000,115200,117200,123200,125200],[20000,197000,200000,71000,117700,119700,125700,127700],
[21000,200000,203000,73000,120200,122200,128200,130200],[22000,203000,206000,75000,122700,124700,130700,132700],
[23000,206000,209000,77000,125200,127200,133200,135200],[24000,209000,212000,79000,127700,129700,135700,137700],
[25000,212000,215000,81000,130200,132200,138200,140200],[26000,215000,218000,83000,132700,134700,140700,142700],
[27000,218000,221000,85000,135200,137200,143200,145200],[28000,221000,224000,87000,137700,139700,145700,147700],
[29000,224000,227000,89000,140200,142200,148200,150200],[30000,227000,232000,91000,142700,144700,150700,152700],
[31000,230000,233000,93000,145200,147200,153200,155200],[32000,233000,236000,95000,147700,149700,155700,157700],
[33000,236000,239000,97000,150200,152200,158200,160200],[34000,239000,242000,99000,152700,154700,160700,162700],
[35000,242000,245000,101000,155200,157200,163200,165200],[36000,245000,248000,103000,157700,159700,165700,167700],
[37000,248000,251000,105000,160200,162200,168200,170200],[38000,251000,254000,107000,162700,164700,170700,172700],
[39000,254000,257000,109000,165200,167200,173200,175200],[40000,257000,260000,111000,167700,169700,175700,177700],
[41000,260000,263000,113000,170200,172200,178200,180200],[42000,263000,266000,115000,172700,174700,180700,182700],
[43000,266000,269000,117000,175200,177200,183200,185200],[44000,269000,272000,119000,177700,179700,185700,187700],
[45000,272000,275000,121000,180200,182200,188200,190200],[46000,275000,278000,123000,182700,184700,190700,192700],
[47000,278000,281000,125000,185200,187200,193200,195200],[48000,281000,284000,127000,187700,189700,195700,197700],
[49000,284000,287000,129000,190200,192200,198200,200200],[50000,287000,290000,131000,192700,194700,200700,202700],
[51000,290000,293000,133000,195200,197200,203200,205200],[52000,293000,296000,135000,197700,199700,205700,207700],
[53000,296000,299000,137000,200200,202200,208200,210200],[54000,299000,302000,139000,202700,204700,210700,212700],
[55000,302000,305000,141000,205200,207200,213200,215200],[56000,305000,308000,143000,207700,209700,215700,217700],
[57000,308000,311000,145000,210200,212200,218200,220200],[58000,311000,314000,147000,212700,214700,220700,222700],
[59000,314000,317000,149000,215200,217200,223200,225200],[60000,317000,320000,151000,217700,219700,225700,227700],
[61000,320000,323000,153000,220200,222200,228200,230200],[62000,323000,326000,155000,222700,224700,230700,232700],
[63000,326000,329000,157000,225200,227200,233200,235200],[64000,329000,332000,159000,227700,229700,235700,237700],
[65000,332000,335000,161000,230200,232200,238200,240200],[66000,335000,338000,163000,232700,234700,240700,242700],
[67000,338000,341000,165000,235200,237200,243200,245200],[68000,341000,344000,167000,237700,239700,245700,247700],
[69000,344000,347000,169000,240200,242200,248200,250200],[70000,347000,350000,171000,242700,244700,250700,252700],
[71000,350000,353000,173000,245200,247200,253200,255200],[72000,353000,356000,175000,247700,249700,255700,257700],
[73000,356000,359000,177000,250200,252200,258200,260200],[74000,359000,362000,179000,252700,254700,260700,262700],
[75000,362000,365000,181000,255200,257200,263200,265200],[76000,365000,368000,183000,257700,259700,265700,267700],
[77000,368000,371000,185000,260200,262200,268200,270200],[78000,371000,374000,187000,262700,264700,270700,272700],
[79000,374000,377000,189000,265200,267200,273200,275200],[80000,377000,380000,191000,267700,269700,275700,277700],
];
const DEF_SURCHARGES=[
  {id:"kubun",name:"区分建物",amount:5000},
];
// 旧・事務所固有のデフォルト加算ID（汎用化で削除。保存済み設定からも自動除去する）
const REMOVED_SC_IDS=["kachitas","sbi"];
const DEF_UNIT={propAdd:2000,deletionBase:12000,deletionPropAdd:2000,addressBase:12000,addressPropAdd:2000};
const DEF_STD_ITEMS=[
  {id:"cert",name:"登記事項証明書",fee:1000,jippi:600,unitLabel:"通"},
  {id:"info",name:"登記情報",fee:500,jippi:330,unitLabel:"件"},
];
const COL_NAMES=["上限(万)","移転(設定有)","移転(設定無)","保存","抵当権設定","抵当権のみ","根抵当権設定","根抵当権のみ"];

const IX={MX:0,IS:1,IN:2,HZ:3,TS:4,TO:5,NS:6,NO:7};
function lk(ft,m,c){if(m<=0)return 0;const r=ft.find(r=>m<=r[IX.MX]);return r?r[c]:ft[ft.length-1][c];}
const LB={transfer:"所有権移転",preservation:"所有権保存",mortgage:"抵当権設定",rootMortgage:"根抵当権設定",deletion:"（根）抵当権抹消",addressChange:"所有権登記名義人住所変更"};
function itemLabel(it){const b=LB[it.type]||it.type;if(it.type==="mortgage"){const m=Math.ceil((it.debtAmount||0)/10000);return m>0?`抵当権設定（債権額${fmtM(m)}）`:b;}if(it.type==="rootMortgage"){const m=Math.ceil((it.debtAmount||0)/10000);return m>0?`根抵当権設定（極度額${fmtM(m)}）`:b;}return b;}
const f1=v=>Math.max(1000,Math.floor(v/1000)*1000);
const f2=v=>v<=0?0:Math.max(1000,Math.floor(v/100)*100);

function calcTaxDetail(type,it,hc){
  const pc=it.propCount||1;
  if(type==="transfer"){
    if(it.causeType==="sale"){
      const lraw=it.landValue||0,braw=it.buildingValue||0;
      const lb=lraw>0?f1(lraw):0,bb=braw>0?f1(braw):0;
      let lr=15/1000,br=20/1000;
      if(hc==="general")br=3/1000;if(hc==="premium")br=1/1000;
      const ltRaw=lb*lr,btRaw=bb*br,sumRaw=ltRaw+btRaw;
      const total=sumRaw>0?f2(sumRaw):1000;
      return{total,steps:[
        ...(lraw>0?[{l:"土地 課税標準",v:`${lraw.toLocaleString()} → ${lb.toLocaleString()}（千円未満切捨）`},
          {l:"土地 税額",v:`${lb.toLocaleString()} × ${lr*1000}/1000 = ${ltRaw.toLocaleString()}`}]:[]),
        ...(braw>0?[{l:"建物 課税標準",v:`${braw.toLocaleString()} → ${bb.toLocaleString()}（千円未満切捨）`},
          {l:"建物 税額",v:`${bb.toLocaleString()} × ${br*1000}/1000 = ${btRaw.toLocaleString()}`}]:[]),
        ...(lraw>0&&braw>0?[{l:"合算",v:`${ltRaw.toLocaleString()} + ${btRaw.toLocaleString()} = ${sumRaw.toLocaleString()}`}]:[]),
        {l:"税額（百円未満切捨）",v:`${sumRaw.toLocaleString()} → ${total.toLocaleString()}`},
      ],lt:ltRaw,bt:btRaw,lr,br};
    }
    if(it.causeType==="inheritance"){
      // 相続：1筆の価額が100万円以下の土地は非課税（措置法84条の2の3②）。建物は対象外
      const r=4/1000;
      const pval=p=>{const pr=Number(p.price)||0,n=Number(p.num)||0,d=Number(p.den)||0,mn=Number(p.mnum)||0,md=Number(p.mden)||0;let v=(n>0&&d>0)?pr/d*n:pr;if(p.road)v=v*0.3;if(mn>0&&md>0)v=v*mn/md;return Math.floor(v);};
      const ls=it.shiki&&it.shiki.lands;
      let taxLand=0,exemptSum=0,exemptN=0;
      if(ls&&ls.length){ls.forEach(p=>{const v=pval(p);if(v<=0)return;if(v<=1000000){exemptSum+=v;exemptN++;}else taxLand+=v;});}
      else{const lvAll=it.landValue||0;if(lvAll>0&&lvAll<=1000000){exemptSum=lvAll;exemptN=1;}else taxLand=lvAll;}
      const bld=it.buildingValue||0,raw=taxLand+bld;
      const base=raw>0?f1(raw):0,taxRaw=base*r,tax=raw>0?f2(taxRaw):0;
      return{total:tax,steps:[
        ...(exemptN>0?[{l:"非課税（100万円以下の土地）",v:`${exemptN}件 計${exemptSum.toLocaleString()}円 → 課税対象外（措置法84条の2の3②）`}]:[]),
        {l:"課税標準",v:`${raw.toLocaleString()} → ${base.toLocaleString()}（千円未満切捨）`},
        {l:"税額",v:`${base.toLocaleString()} × 4/1000 = ${taxRaw.toLocaleString()} → ${tax.toLocaleString()}（百円未満切捨）`},
      ],lt:0,bt:0,lr:r,br:r,exemptSum,exemptN,taxLand};
    }
    const raw=(it.landValue||0)+(it.buildingValue||0);
    const r=20/1000;
    const base=f1(raw),taxRaw=base*r,tax=f2(taxRaw);
    return{total:tax,steps:[
      {l:"課税標準",v:`${raw.toLocaleString()} → ${base.toLocaleString()}（千円未満切捨）`},
      {l:"税額",v:`${base.toLocaleString()} × ${r*1000}/1000 = ${taxRaw.toLocaleString()} → ${tax.toLocaleString()}（百円未満切捨）`},
    ],lt:0,bt:0,lr:r,br:r};
  }
  if(type==="preservation"){
    let r=4/1000;if(hc==="general")r=1.5/1000;if(hc==="premium")r=1/1000;
    const raw=it.taxableValue||0,base=f1(raw),taxRaw=base*r,tax=f2(taxRaw);
    return{total:tax,steps:[
      {l:"課税標準",v:`${raw.toLocaleString()} → ${base.toLocaleString()}（千円未満切捨）`},
      {l:"税額",v:`${base.toLocaleString()} × ${r*1000}/1000 = ${taxRaw.toLocaleString()} → ${tax.toLocaleString()}（百円未満切捨）`},
    ]};
  }
  if(type==="mortgage"){
    let r=4/1000;if(hc==="general"||hc==="premium")r=1/1000;
    const raw=it.debtAmount||0,base=f1(raw),taxRaw=base*r,tax=f2(taxRaw);
    return{total:tax,steps:[
      {l:"課税標準",v:`${raw.toLocaleString()} → ${base.toLocaleString()}（千円未満切捨）`},
      {l:"税額",v:`${base.toLocaleString()} × ${r*1000}/1000 = ${taxRaw.toLocaleString()} → ${tax.toLocaleString()}（百円未満切捨）`},
    ]};
  }
  if(type==="rootMortgage"){
    const r=4/1000;
    const raw=it.debtAmount||0,base=f1(raw),taxRaw=base*r,tax=f2(taxRaw);
    return{total:tax,steps:[
      {l:"課税標準",v:`${raw.toLocaleString()} → ${base.toLocaleString()}（千円未満切捨）`},
      {l:"税額",v:`${base.toLocaleString()} × ${r*1000}/1000 = ${taxRaw.toLocaleString()} → ${tax.toLocaleString()}（百円未満切捨）`},
    ]};
  }
  if(type==="deletion"){
    const raw=pc*1000,tax=Math.min(raw,20000);
    return{total:tax,steps:[{l:"計算",v:`${pc}個 × 1,000 = ${raw.toLocaleString()}`},...(raw>20000?[{l:"上限適用",v:"20,000（上限）"}]:[]),]};
  }
  if(type==="addressChange"){
    const tax=pc*1000;
    return{total:tax,steps:[{l:"計算",v:`${pc}個 × 1,000 = ${tax.toLocaleString()}`}]};
  }
  return{total:0,steps:[]};
}

function calcItem(it,g){
  let lv=0,fb=0,col="";
  const{ft,unit}=g;
  const isSimpleType=it.type==="deletion"||it.type==="addressChange";
  if(it.type==="transfer"){
    const tv=(it.landValue||0)+(it.buildingValue||0);lv=Math.ceil(tv/10000);
    const ci=g.hasMtg?IX.IS:IX.IN;col=g.hasMtg?"移転(設定有)":"移転(設定無)";fb=lk(ft,lv,ci);
  }else if(it.type==="preservation"){lv=Math.ceil((it.taxableValue||0)/10000);col="保存";fb=lk(ft,lv,IX.HZ);
  }else if(it.type==="mortgage"){lv=Math.ceil((it.debtAmount||0)/10000);col=g.hasTr?"抵当権設定":"抵当権(設定のみ)";fb=lk(ft,lv,g.hasTr?IX.TS:IX.TO);
  }else if(it.type==="rootMortgage"){lv=Math.ceil((it.debtAmount||0)/10000);col=g.hasTr?"根抵当権設定":"根抵当権(設定のみ)";fb=lk(ft,lv,g.hasTr?IX.NS:IX.NO);
  }else if(it.type==="deletion"){fb=unit.deletionBase;col="抹消";
  }else if(it.type==="addressChange"){fb=unit.addressBase;col="住変";}
  const propAddUnit=it.type==="deletion"?unit.deletionPropAdd:it.type==="addressChange"?unit.addressPropAdd:unit.propAdd;
  const ep=Math.max(0,((it.propCount||1)-1))*propAddUnit;
  let sc=0;const scItems=[];
  if(!isSimpleType){g.surcharges.forEach(s=>{if(g.enabledSc[s.id]){sc+=s.amount;scItems.push(s);}});}
  const fee=fb+ep;
  const txd=calcTaxDetail(it.type,it,g.housingCert);
  return{fee,fb,ep,sc,scItems,tax:txd.total,txd,lv,col,isSimpleType,propAddUnit};
}

function fmt(n){return n==null||isNaN(n)||n===0?"¥0":"¥"+n.toLocaleString();}
function fmtM(n){if(!n||n<=0)return"";if(n>=10000){const o=Math.floor(n/10000),r=n%10000;return r>0?`${o}億${r.toLocaleString()}万円`:`${o}億円`;}return`${n.toLocaleString()}万円`;}

function getExpList(counts,stdItems,postage,extras){
  const l=[];
  stdItems.forEach(si=>{const c=counts[si.id]||0;if(c>0&&si.jippi>0)l.push({name:`${si.name} ${c}${si.unitLabel}`,amount:c*si.jippi,src:"std"});});
  if(postage>0)l.push({name:"郵送費",amount:postage});
  extras.forEach(e=>{const a=Number(e.expense)||0;if(a>0)l.push({name:e.name||"その他",amount:a,src:"extra"});});
  return l;
}
function getXFee(counts,stdItems,extras){
  let f=0;stdItems.forEach(si=>{f+=(counts[si.id]||0)*si.fee;});
  extras.forEach(e=>f+=(Number(e.fee)||0));return f;
}

function buildFeeRows(rows,stdItems){
  const out=[];
  rows.forEach(row=>{
    if(row.kind==="std"){const si=stdItems.find(s=>s.id===row.stdId);if(!si)return;const c=row.count||0;if(c<=0)return;out.push({name:`${si.name} ${c}${si.unitLabel}`,fee:c*si.fee,jippi:c*si.jippi});}
    else if(row.kind==="postage"){const a=row.amount||0;if(a>0)out.push({name:"郵送費",fee:0,jippi:a});}
    else if(row.kind==="extra"){const f=Number(row.fee)||0,x=Number(row.expense)||0;if(f>0||x>0)out.push({name:row.name||"その他",fee:f,jippi:x});}
  });
  return out;
}

// ご請求明細の行と合計をまとめて算出（画面表示・コピーで共用）
function buildMeisai(items,g,scTotal,rows,stdItems,rate){
  const feeRows=buildFeeRows(rows,stdItems);
  const regLines=items.map((it,i)=>{const c=calcItem(it,g);const fee=i===0?c.fee+scTotal:c.fee;return{it,c,fee,addSc:i===0?scTotal:0};});
  const regTax=regLines.reduce((s,l)=>s+l.c.tax,0);
  const regFee=regLines.reduce((s,l)=>s+l.fee,0);
  const otherFee=feeRows.reduce((s,r)=>s+r.fee,0);
  const jippiTotal=feeRows.reduce((s,r)=>s+r.jippi,0);
  const feeExcl=regFee+otherFee;
  const consumptionTax=Math.floor(feeExcl*rate/100);
  const feeIncl=feeExcl+consumptionTax;
  const grand=feeIncl+regTax+jippiTotal;
  return{regLines,feeRows,regFee,otherFee,regTax,jippiTotal,feeExcl,consumptionTax,feeIncl,grand};
}

// 明細を帳票ソフト貼り付け用のTSVに（行ラベル＋タブ区切り。数値は桁区切りなしの生の数字）
// 顧客名・振込先などはソフトが行の並びで読むため、値が空でもラベル行は必ず出力する。
// 合計はソフト側が「作業項目」と「消費税課税」から算出するので出力しない。
// 事務所・事件番号・得意先・顧客名・振込先・備考・メモはソフト側で入力するため常に空欄
function meisaiToTSV(m,rate,opts={}){
  const L=[];const p=(...v)=>L.push(v.join("\t"));
  p("事務所","");
  p("請求日",opts.billingDate||"");
  p("事件番号","");
  p("得意先","");
  p("顧客名①","","様");
  p("顧客名②","","");
  p("顧客名③","","");
  p("振込先①","","","","");
  p("源泉対象","0");
  p("消費税課税","1",`${Number(rate).toFixed(2)}%`);
  m.regLines.forEach(({it,c,fee})=>p("作業項目",itemLabel(it),String(fee),String(c.tax)));
  m.feeRows.forEach(r=>p("作業項目",r.name,String(r.fee),String(r.jippi)));
  p("備考","");
  p("メモ","");
  return L.join("\n");
}

export { DEF_FT, DEF_SURCHARGES, REMOVED_SC_IDS, DEF_UNIT, DEF_STD_ITEMS, COL_NAMES, IX, lk, LB, itemLabel, f1, f2, calcTaxDetail, calcItem, fmt, fmtM, getExpList, getXFee, buildFeeRows, buildMeisai, meisaiToTSV };
