import { useState, useMemo, useEffect, useRef } from "react";

import { DEF_FT, DEF_SURCHARGES, REMOVED_SC_IDS, DEF_UNIT, DEF_STD_ITEMS, COL_NAMES, itemLabel, calcItem, f1, f2, fmt, fmtM, getExpList, getXFee, buildMeisai, meisaiToTSV } from "./calc";
import { exportAllSettings, importAllSettings, SETTINGS_NOTE } from "./settings";
// テスト版(/test/)は本番と同一ドメインのため、保存キーを分けて本番設定を保護する
const CFG_KEY = ((import.meta.env && import.meta.env.BASE_URL) || "").includes("/test/") ? "test-fee-config-v4" : "fee-config-v4";

// ── UI atoms ──
const Inp=({label,value,onChange,type="number",suffix,note,min,step,placeholder,className=""})=>(
  <div className={`mb-3 ${className}`}>{label&&<label className="block text-xs font-medium mb-1" style={{color:"#566275"}}>{label}</label>}
    <div className="flex items-center gap-2">
      <input type={type} value={value} placeholder={placeholder} min={min} step={step}
        onChange={e=>onChange(type==="number"?(e.target.value===""?"":Number(e.target.value)):e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
        style={{background:"#f0f3f8",border:"1.5px solid #dce1ea",color:"#1a2233",fontVariantNumeric:"tabular-nums"}}
        onFocus={e=>{e.target.style.borderColor="#4338ca";e.target.style.background="#fff"}}
        onBlur={e=>{e.target.style.borderColor="#dce1ea";e.target.style.background="#f0f3f8"}} />
      {suffix&&<span className="text-xs whitespace-nowrap flex-shrink-0" style={{color:"#8393a7"}}>{suffix}</span>}
    </div>{note&&<p className="text-xs mt-1" style={{color:"#4338ca"}}>{note}</p>}</div>
);
const Sel=({label,value,onChange,options})=>(
  <div className="mb-3">{label&&<label className="block text-xs font-medium mb-1" style={{color:"#566275"}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
      style={{background:"#f0f3f8",border:"1.5px solid #dce1ea",color:"#1a2233",appearance:"none",
        backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238393a7'/%3E%3C/svg%3E")`,
        backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center"}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
);
const Chk=({label,checked,onChange,accent})=>(
  <div className="flex items-center gap-2 mb-2 cursor-pointer select-none text-sm" style={{color:"#3a4557"}} onClick={e=>{e.preventDefault();onChange();}}>
    <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
      style={{background:checked?(accent||"#4338ca"):"#e2e8f0",border:checked?"none":"1.5px solid #c5cdd8"}}>
      {checked&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div><span>{label}</span></div>
);
const Rw=({label,value,sub,hl,bold})=>(
  <div className="flex justify-between items-baseline py-1.5" style={{borderBottom:"1px solid #edf0f5"}}>
    <span className={`text-sm ${bold?"font-bold":""}`} style={{color:sub?"#8393a7":"#3a4557"}}>{label}</span>
    <span className={`text-sm ${bold?"font-bold":"font-medium"}`} style={{color:hl?"#4338ca":"#1a2233",fontVariantNumeric:"tabular-nums"}}>{value}</span></div>
);
function StepRow({label,note,count,setCount,unitL}){
  return(<div className="py-2.5" style={{borderBottom:"1px solid #f0f3f8"}}>
    <div className="flex items-center justify-between gap-3" style={{flexWrap:"nowrap"}}>
      <span className="text-sm flex-1 min-w-0 truncate" style={{color:"#3a4557"}}>{label||"（名称なし）"}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={()=>setCount(Math.max(0,count-1))} className="w-7 h-7 rounded-lg flex items-center justify-center text-base" style={{background:"#f0f3f8",color:count>0?"#3a4557":"#c5cdd8",border:"1px solid #dce1ea"}}>−</button>
        <span className="text-sm font-medium w-6 text-center" style={{fontVariantNumeric:"tabular-nums"}}>{count}</span>
        <button onClick={()=>setCount(count+1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-base" style={{background:"#f0f3f8",color:"#3a4557",border:"1px solid #dce1ea"}}>+</button>
        <span className="text-xs w-4 flex-shrink-0" style={{color:"#8393a7"}}>{unitL}</span>
      </div>
    </div>
    {count>0&&note&&<div className="text-xs mt-1 pl-1" style={{color:"#8393a7"}}>{note}</div>}
  </div>);
}
function ExtraItem({item,index,total,onChange,onRemove,onMove}){
  const[open,setOpen]=useState(true);
  const f=Number(item.fee)||0,x=Number(item.expense)||0;
  const sm=[];if(f>0)sm.push(`報酬 ${fmt(f)}`);if(x>0)sm.push(`立替 ${fmt(x)}`);
  return(<div className="rounded-lg mb-2 overflow-hidden" style={{border:"1px solid #e5e9f0"}}>
    <div className="flex items-center gap-1 px-3 py-2 cursor-pointer" style={{background:"#f9fafb"}} onClick={()=>setOpen(!open)}>
      <div className="flex flex-col mr-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
        <button onClick={()=>onMove(-1)} disabled={index===0}
          className="text-xs leading-none px-0.5" style={{color:index===0?"#d1d5db":"#4338ca"}}>▲</button>
        <button onClick={()=>onMove(1)} disabled={index>=total-1}
          className="text-xs leading-none px-0.5" style={{color:index>=total-1?"#d1d5db":"#4338ca"}}>▼</button>
      </div>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{transform:open?"rotate(90deg)":"",transition:"transform 0.15s",flexShrink:0}}>
        <path d="M3 1l4 4-4 4" stroke="#8393a7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span className="text-sm flex-1 min-w-0 truncate" style={{color:"#3a4557"}}>{item.name||"（未入力）"}</span>
      {!open&&sm.length>0&&<span className="text-xs flex-shrink-0" style={{color:"#8393a7"}}>{sm.join("／")}</span>}
      <button onClick={e=>{e.stopPropagation();onRemove();}} className="text-xs px-1.5 flex-shrink-0" style={{color:"#e53e3e"}}>✕</button>
    </div>
    {open&&<div className="px-3 pt-2 pb-3" style={{background:"#fff"}}>
      <Inp label="項目名" value={item.name} onChange={v=>onChange({...item,name:v})} type="text" placeholder="例: 日当・交通費" />
      <div className="grid grid-cols-2 gap-x-3">
        <Inp label="報酬（税対象）" value={item.fee} onChange={v=>onChange({...item,fee:v})} suffix="円" placeholder="0" />
        <Inp label="立替金（実費）" value={item.expense} onChange={v=>onChange({...item,expense:v})} suffix="円" placeholder="0" />
      </div>
    </div>}
  </div>);
}

// ── Reorder helper ──
function swap(arr,i,j){const n=[...arr];[n[i],n[j]]=[n[j],n[i]];return n;}

// ── Settings ──
function Settings({ft,setFt,unit,setUnit,surcharges,setSurcharges,stdItems,setStdItems,rate,setRate,onClose}){
  const[tab,setTab]=useState("surcharge");
  const[editCell,setEditCell]=useState(null);
  const[editVal,setEditVal]=useState("");
  const inputRef=useRef(null);
  const[modalSize,setModalSize]=useState({w:720,h:620});

  const onResizeStart=(e)=>{
    e.preventDefault();const sx=e.clientX||e.touches?.[0]?.clientX;const sy=e.clientY||e.touches?.[0]?.clientY;
    const sw=modalSize.w;const sh=modalSize.h;
    const onMove=(ev)=>{const cx=ev.clientX||ev.touches?.[0]?.clientX;const cy=ev.clientY||ev.touches?.[0]?.clientY;
      setModalSize({w:Math.max(400,sw+(cx-sx)),h:Math.max(350,sh+(cy-sy))});};
    const onUp=()=>{document.removeEventListener("mousemove",onMove);document.removeEventListener("mouseup",onUp);
      document.removeEventListener("touchmove",onMove);document.removeEventListener("touchend",onUp);};
    document.addEventListener("mousemove",onMove);document.addEventListener("mouseup",onUp);
    document.addEventListener("touchmove",onMove);document.addEventListener("touchend",onUp);
  };
  const updCell=(ri,ci,val)=>{const n=ft.map(r=>[...r]);n[ri][ci]=Number(val)||0;setFt(n);};
  const startEdit=(ri,ci)=>{setEditCell({ri,ci});setEditVal(String(ft[ri][ci]));setTimeout(()=>inputRef.current?.focus(),50);};
  const commitEdit=()=>{if(editCell)updCell(editCell.ri,editCell.ci,editVal);setEditCell(null);};
  const addSc=()=>setSurcharges(p=>[...p,{id:"sc_"+Date.now(),name:"",amount:0}]);
  const updSc=(i,patch)=>setSurcharges(p=>p.map((s,j)=>j===i?{...s,...patch}:s));
  const rmSc=(i)=>setSurcharges(p=>p.filter((_,j)=>j!==i));
  const addSI=()=>setStdItems(p=>[...p,{id:"si_"+Date.now(),name:"",fee:0,jippi:0,unitLabel:"件"}]);
  const updSI=(i,patch)=>setStdItems(p=>p.map((s,j)=>j===i?{...s,...patch}:s));
  const rmSI=(i)=>setStdItems(p=>p.filter((_,j)=>j!==i));

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.5)"}}>
      <div className="rounded-2xl relative" style={{background:"#fff",width:modalSize.w,height:modalSize.h,maxWidth:"98vw",maxHeight:"98vh",display:"flex",flexDirection:"column",boxShadow:"0 25px 50px rgba(0,0,0,0.15)"}}>
        <div className="flex justify-between items-center px-5 pt-4 pb-2 flex-shrink-0">
          <h3 className="text-base font-bold" style={{color:"#1a2233"}}>報酬設定</h3>
          <div className="flex items-center gap-2"><span className="text-xs select-none" style={{color:"#b0b8c4"}}>↘ 角ドラッグでリサイズ</span>
            <button onClick={onClose} className="text-xl px-2" style={{color:"#8393a7"}}>×</button></div>
        </div>
        <div className="flex gap-1 px-5 pb-2 flex-shrink-0">
          {[["surcharge","加算"],["stdItems","謄本・情報・項目"],["table","報酬テーブル"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{background:tab===k?"#4338ca":"#f0f3f8",color:tab===k?"#fff":"#566275"}}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-auto px-5 pb-5" style={{minHeight:0}}>

          {tab==="surcharge"&&<div>
            <h4 className="text-xs font-bold mt-2 mb-3" style={{color:"#4338ca"}}>特別加算（共通設定のチェックに連動）</h4>
            {surcharges.map((s,i)=>(
              <div key={s.id} className="flex gap-2 mb-2 items-end">
                <div className="flex-1">{i===0&&<label className="block text-xs mb-1" style={{color:"#8393a7"}}>項目名</label>}
                  <input type="text" value={s.name} placeholder="項目名" onChange={e=>updSc(i,{name:e.target.value})}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{background:"#f0f3f8",border:"1.5px solid #dce1ea",color:"#1a2233"}}
                    onFocus={e=>{e.target.style.borderColor="#4338ca"}} onBlur={e=>{e.target.style.borderColor="#dce1ea"}} /></div>
                <div style={{width:120}}>{i===0&&<label className="block text-xs mb-1" style={{color:"#8393a7"}}>金額</label>}
                  <div className="flex items-center gap-1"><input type="number" value={s.amount} min={0} step={1000}
                    onChange={e=>updSc(i,{amount:e.target.value===""?0:Number(e.target.value)})}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none text-right" style={{background:"#f0f3f8",border:"1.5px solid #dce1ea",color:"#1a2233",fontVariantNumeric:"tabular-nums"}}
                    onFocus={e=>{e.target.style.borderColor="#4338ca"}} onBlur={e=>{e.target.style.borderColor="#dce1ea"}} />
                    <span className="text-xs flex-shrink-0" style={{color:"#8393a7"}}>円</span></div></div>
                <button onClick={()=>rmSc(i)} className="text-xs px-2 py-2 rounded-lg hover:bg-red-50 flex-shrink-0" style={{color:"#e53e3e"}}>✕</button>
              </div>
            ))}
            <button onClick={addSc} className="text-xs py-2 px-4 rounded-lg font-medium w-full mt-1"
              style={{color:"#4338ca",background:"#eef2ff",border:"1.5px dashed #c7d2fe"}}>＋ 加算項目を追加</button>
            <button onClick={()=>{if(confirm("デフォルトに戻しますか？"))setSurcharges(DEF_SURCHARGES.map(s=>({...s})));}}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg" style={{color:"#e53e3e",background:"#fef2f2"}}>デフォルトに戻す</button>

            <h4 className="text-xs font-bold mt-5 mb-3" style={{color:"#4338ca"}}>基本報酬（抹消・住変）</h4>
            <div className="grid grid-cols-2 gap-x-3">
              <Inp label="抹消 基本報酬" value={unit.deletionBase} onChange={v=>setUnit({...unit,deletionBase:v})} suffix="円" />
              <Inp label="抹消 不動産加算" value={unit.deletionPropAdd} onChange={v=>setUnit({...unit,deletionPropAdd:v})} suffix="円/個" />
              <Inp label="住変 基本報酬" value={unit.addressBase} onChange={v=>setUnit({...unit,addressBase:v})} suffix="円" />
              <Inp label="住変 不動産加算" value={unit.addressPropAdd} onChange={v=>setUnit({...unit,addressPropAdd:v})} suffix="円/個" />
            </div>

            <h4 className="text-xs font-bold mt-5 mb-3" style={{color:"#4338ca"}}>その他単価</h4>
            <Inp label="不動産加算（移転・保存・設定 1個あたり）" value={unit.propAdd} onChange={v=>setUnit({...unit,propAdd:v})} suffix="円" />
            <Inp label="消費税率" value={rate} onChange={setRate} suffix="%" min={0} step={1} note="通常は10%です（ご請求明細に反映）" />
            <button onClick={()=>{if(confirm("デフォルトに戻しますか？"))setUnit({...DEF_UNIT});}}
              className="mt-1 text-xs px-3 py-1.5 rounded-lg" style={{color:"#e53e3e",background:"#fef2f2"}}>デフォルトに戻す</button>
          </div>}

          {tab==="stdItems"&&<div>
            <p className="text-xs mb-3" style={{color:"#8393a7"}}>登記事項証明書・登記情報などの項目。追加した項目は本画面の「追加項目」でプルダウン選択できます。▲▼で並び替え。</p>
            {stdItems.map((si,i)=>(
              <div key={si.id} className="rounded-lg mb-2 p-3" style={{background:"#f9fafb",border:"1px solid #e5e9f0"}}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={()=>{if(i>0)setStdItems(swap(stdItems,i,i-1));}} disabled={i===0}
                      className="text-xs leading-none px-1" style={{color:i===0?"#d1d5db":"#4338ca"}}>▲</button>
                    <button onClick={()=>{if(i<stdItems.length-1)setStdItems(swap(stdItems,i,i+1));}} disabled={i===stdItems.length-1}
                      className="text-xs leading-none px-1" style={{color:i===stdItems.length-1?"#d1d5db":"#4338ca"}}>▼</button>
                  </div>
                  <input type="text" value={si.name} placeholder="項目名" onChange={e=>updSI(i,{name:e.target.value})}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none font-medium"
                    style={{background:"#fff",border:"1.5px solid #dce1ea",color:"#1a2233"}}
                    onFocus={e=>{e.target.style.borderColor="#4338ca"}} onBlur={e=>{e.target.style.borderColor="#dce1ea"}} />
                  <button onClick={()=>rmSI(i)} className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 flex-shrink-0" style={{color:"#e53e3e"}}>✕</button>
                </div>
                <div className="grid grid-cols-3 gap-x-2">
                  <div><label className="block text-xs mb-1" style={{color:"#8393a7"}}>報酬</label>
                    <div className="flex items-center gap-1"><input type="number" value={si.fee} min={0}
                      onChange={e=>updSI(i,{fee:e.target.value===""?0:Number(e.target.value)})}
                      className="w-full px-2 py-1.5 rounded-lg text-sm outline-none text-right"
                      style={{background:"#fff",border:"1.5px solid #dce1ea",fontVariantNumeric:"tabular-nums"}}
                      onFocus={e=>{e.target.style.borderColor="#4338ca"}} onBlur={e=>{e.target.style.borderColor="#dce1ea"}} />
                      <span className="text-xs flex-shrink-0" style={{color:"#8393a7"}}>円</span></div></div>
                  <div><label className="block text-xs mb-1" style={{color:"#8393a7"}}>実費</label>
                    <div className="flex items-center gap-1"><input type="number" value={si.jippi} min={0}
                      onChange={e=>updSI(i,{jippi:e.target.value===""?0:Number(e.target.value)})}
                      className="w-full px-2 py-1.5 rounded-lg text-sm outline-none text-right"
                      style={{background:"#fff",border:"1.5px solid #dce1ea",fontVariantNumeric:"tabular-nums"}}
                      onFocus={e=>{e.target.style.borderColor="#4338ca"}} onBlur={e=>{e.target.style.borderColor="#dce1ea"}} />
                      <span className="text-xs flex-shrink-0" style={{color:"#8393a7"}}>円</span></div></div>
                  <div><label className="block text-xs mb-1" style={{color:"#8393a7"}}>単位</label>
                    <input type="text" value={si.unitLabel} onChange={e=>updSI(i,{unitLabel:e.target.value})}
                      className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                      style={{background:"#fff",border:"1.5px solid #dce1ea"}}
                      onFocus={e=>{e.target.style.borderColor="#4338ca"}} onBlur={e=>{e.target.style.borderColor="#dce1ea"}} /></div>
                </div>
              </div>
            ))}
            <button onClick={addSI} className="text-xs py-2 px-4 rounded-lg font-medium w-full mt-1"
              style={{color:"#4338ca",background:"#eef2ff",border:"1.5px dashed #c7d2fe"}}>＋ 項目を追加</button>
            <button onClick={()=>{if(confirm("デフォルトに戻しますか？"))setStdItems(DEF_STD_ITEMS.map(s=>({...s})));}}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg" style={{color:"#e53e3e",background:"#fef2f2"}}>デフォルトに戻す</button>
          </div>}

          {tab==="table"&&<div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <p className="text-xs" style={{color:"#8393a7"}}>セルをタップして編集（全{ft.length}行）</p>
              <button onClick={()=>{if(confirm("デフォルトに戻しますか？"))setFt(DEF_FT.map(r=>[...r]));}}
                className="text-xs px-3 py-1.5 rounded-lg" style={{color:"#e53e3e",background:"#fef2f2"}}>デフォルトに戻す</button>
            </div>
            <div className="overflow-auto rounded-lg" style={{border:"1px solid #e5e9f0",flex:"1 1 auto"}}>
              <table className="w-full text-xs" style={{minWidth:700,borderCollapse:"collapse"}}>
                <thead style={{position:"sticky",top:0,zIndex:2}}><tr style={{background:"#eef2ff"}}>
                  {COL_NAMES.map((n,i)=><th key={i} className="px-2 py-2 text-left font-medium whitespace-nowrap"
                    style={{color:"#4338ca",borderBottom:"2px solid #c7d2fe",position:i===0?"sticky":"static",left:i===0?0:"auto",background:"#eef2ff",zIndex:i===0?3:2}}>{n}</th>)}
                </tr></thead>
                <tbody>{ft.map((row,ri)=>(
                  <tr key={ri} style={{background:ri%2===0?"#fff":"#fafbfd"}}>
                    {row.map((v,ci)=>{
                      const editing=editCell?.ri===ri&&editCell?.ci===ci;
                      return <td key={ci} className="px-2 py-1.5 cursor-pointer whitespace-nowrap"
                        style={{borderBottom:"1px solid #f0f3f8",color:ci===0?"#4338ca":"#1a2233",fontVariantNumeric:"tabular-nums",fontWeight:ci===0?"600":"400",
                          position:ci===0?"sticky":"static",left:ci===0?0:"auto",background:ci===0?(ri%2===0?"#fff":"#fafbfd"):"transparent",zIndex:ci===0?1:0}}
                        onClick={()=>!editing&&startEdit(ri,ci)}>
                        {editing?<input ref={inputRef} type="number" value={editVal} onChange={e=>setEditVal(e.target.value)}
                          onBlur={commitEdit} onKeyDown={e=>{if(e.key==="Enter")commitEdit();if(e.key==="Escape")setEditCell(null);}}
                          className="w-full px-1 py-0.5 rounded text-xs outline-none" style={{background:"#eff6ff",border:"1.5px solid #4338ca",fontVariantNumeric:"tabular-nums"}} />
                          :ci===0?v.toLocaleString()+"万":v.toLocaleString()}
                      </td>;
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>}
        </div>
        <div className="px-5 py-3 flex-shrink-0" style={{borderTop:"1px solid #e5e9f0"}}>
          <p className="text-[11px] mb-2" style={{color:"#8393a7"}}>※ {SETTINGS_NOTE}</p>
          <div className="flex gap-2 items-center">
            <button onClick={exportAllSettings} className="px-4 py-2.5 rounded-xl text-xs font-medium" style={{background:"#eef2ff",color:"#4338ca",border:"1px solid #c7d2fe"}}>全設定をエクスポート</button>
            <button onClick={importAllSettings} className="px-4 py-2.5 rounded-xl text-xs font-medium" style={{background:"#f0fdf4",color:"#059669",border:"1px solid #bbf7d0"}}>全設定をインポート</button>
            <div className="flex-1" />
            <button onClick={onClose} className="px-8 py-2.5 rounded-xl text-sm font-medium text-white" style={{background:"linear-gradient(135deg,#4338ca,#3730a3)"}}>閉じる</button>
          </div>
        </div>
        <div onMouseDown={onResizeStart} onTouchStart={onResizeStart}
          style={{position:"absolute",right:0,bottom:0,width:28,height:28,cursor:"nwse-resize",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"0 0 16px 0",userSelect:"none",touchAction:"none"}}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M11 1L1 11M11 5L5 11M11 9L9 11" stroke="#b0b8c4" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </div>
    </div>);
}

// 土地・建物の内訳モーダル：敷地権持分と移転持分を別々に持ち、物件ごとに設定（空欄＝満額）
function ShikiModal({initialLands,initialBuildings,onApply,onClose}){
  const[lands,setLands]=useState(initialLands&&initialLands.length?initialLands.map(p=>({...p})):[{price:"",num:"",den:"",mnum:"",mden:""}]);
  const[bldgs,setBldgs]=useState(initialBuildings&&initialBuildings.length?initialBuildings.map(p=>({...p})):[{val:"",mnum:"",mden:""}]);
  const[useShare,setUseShare]=useState((initialLands||[]).some(p=>Number(p.mnum)>0&&Number(p.mden)>0)||(initialBuildings||[]).some(p=>Number(p.mnum)>0&&Number(p.mden)>0));
  const toggleShare=()=>{const nv=!useShare;setUseShare(nv);if(!nv){setLands(a=>a.map(p=>({...p,mnum:"",mden:""})));setBldgs(a=>a.map(p=>({...p,mnum:"",mden:""})));}};
  const upL=(i,k,v)=>setLands(a=>a.map((p,j)=>j===i?{...p,[k]:v}:p));
  const upB=(i,k,v)=>setBldgs(a=>a.map((p,j)=>j===i?{...p,[k]:v}:p));
  const lv=p=>{const pr=Number(p.price)||0,n=Number(p.num)||0,d=Number(p.den)||0,mn=Number(p.mnum)||0,md=Number(p.mden)||0;let v=(n>0&&d>0)?pr/d*n:pr;if(p.road)v=v*0.3;if(mn>0&&md>0)v=v*mn/md;return v;};
  const bv=p=>{const v=Number(p.val)||0,mn=Number(p.mnum)||0,md=Number(p.mden)||0;return (mn>0&&md>0)?v*mn/md:v;};
  const landSum=Math.floor(lands.reduce((s,p)=>s+lv(p),0));
  const bldgSum=Math.floor(bldgs.reduce((s,p)=>s+bv(p),0));
  const NI=(value,onChange,ph,w)=>(<input type="number" inputMode="numeric" value={value} placeholder={ph} onChange={e=>onChange(e.target.value===""?"":Number(e.target.value))} className="px-2 py-1.5 rounded-lg text-sm outline-none text-right" style={{width:w,background:"#f0f3f8",border:"1.5px solid #dce1ea",fontVariantNumeric:"tabular-nums"}} />);
  const Frac=(label,n,d,onN,onD,color)=>(<div><label className="block text-[10px] mb-1" style={{color}}>{label}</label><div className="flex items-center gap-1">{NI(n,onN,"分子",70)}<span style={{color:"#8393a7"}}>/</span>{NI(d,onD,"分母",70)}</div></div>);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.45)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} className="rounded-2xl" style={{background:"#fff",width:"100%",maxWidth:820,maxHeight:"92vh",overflowY:"auto",padding:28,boxShadow:"0 12px 40px rgba(0,0,0,0.28)"}}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold" style={{color:"#1a2233"}}>土地・建物の内訳</h3>
          <button onClick={onClose} className="text-lg leading-none" style={{color:"#8393a7"}}>×</button>
        </div>
        <p className="text-xs mb-3" style={{color:"#8393a7",lineHeight:1.7}}>複数入力できます。合計を各「評価額合計」へ転記。<b style={{color:"#1d4ed8"}}>敷地権持分</b>＝区分建物の敷地按分（空欄＝満額）。</p>
        <label className="flex items-center gap-2 cursor-pointer mb-4" onClick={toggleShare} style={{userSelect:"none"}}>
          <div className="relative rounded-full transition-all" style={{width:34,height:18,background:useShare?"#7c3aed":"#dce1ea",flexShrink:0}}><div className="absolute rounded-full bg-white shadow transition-all" style={{width:14,height:14,top:2,left:useShare?18:2}} /></div>
          <span className="text-xs" style={{color:useShare?"#7c3aed":"#8393a7",fontWeight:useShare?700:500}}>共有持分の移転がある（移転持分を入力）</span>
        </label>

        <div className="text-xs font-bold mb-2" style={{color:"#1d4ed8"}}>土地</div>
        {lands.map((p,i)=>(
          <div key={i} className="rounded-xl p-3 mb-2" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{color:"#1d4ed8"}}>土地 {i+1}</span>
              {lands.length>1&&<button onClick={()=>setLands(a=>a.filter((_,j)=>j!==i))} className="text-xs" style={{color:"#e53e3e"}}>削除</button>}
            </div>
            <div className="mb-2"><label className="block text-xs mb-1" style={{color:"#566275"}}>評価額（敷地権は一筆の価格）</label>{NI(p.price,v=>upL(i,"price",v),"例: 156566896","100%")}</div>
            <label className="flex items-center gap-2 cursor-pointer mb-2" onClick={()=>upL(i,"road",!p.road)} style={{userSelect:"none"}}>
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{background:p.road?"#0ea5e9":"#e2e8f0",border:p.road?"none":"1.5px solid #c5cdd8"}}>{p.road&&<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
              <span className="text-xs" style={{color:p.road?"#0369a1":"#566275",fontWeight:p.road?700:500}}>公衆用道路（評価額 ×0.3）</span>
            </label>
            <div className="flex items-end gap-3 flex-wrap">
              {Frac("敷地権持分（任意）",p.num,p.den,v=>upL(i,"num",v),v=>upL(i,"den",v),"#1d4ed8")}
              {useShare&&Frac("移転持分（任意）",p.mnum,p.mden,v=>upL(i,"mnum",v),v=>upL(i,"mden",v),"#7c3aed")}
              <div className="flex-1 text-right" style={{minWidth:110}}><div className="text-[10px]" style={{color:"#8393a7"}}>登記評価額</div><div className="text-sm font-bold" style={{color:"#1a2233",fontVariantNumeric:"tabular-nums"}}>{fmt(Math.floor(lv(p)))}</div></div>
            </div>
          </div>
        ))}
        <button onClick={()=>setLands(a=>[...a,{price:"",num:"",den:"",mnum:"",mden:""}])} className="text-xs py-2 px-3 rounded-lg font-medium mb-4" style={{color:"#1d4ed8",background:"#eff6ff",border:"1.5px dashed #bfdbfe"}}>＋ 土地を追加</button>

        <div className="text-xs font-bold mb-2" style={{color:"#b45309"}}>建物</div>
        {bldgs.map((p,i)=>(
          <div key={i} className="rounded-xl p-3 mb-2" style={{background:"#fffbeb",border:"1px solid #fde68a"}}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{color:"#b45309"}}>建物 {i+1}</span>
              {bldgs.length>1&&<button onClick={()=>setBldgs(a=>a.filter((_,j)=>j!==i))} className="text-xs" style={{color:"#e53e3e"}}>削除</button>}
            </div>
            <div className="mb-2"><label className="block text-xs mb-1" style={{color:"#566275"}}>評価額</label>{NI(p.val,v=>upB(i,"val",v),"例: 5081032","100%")}</div>
            {useShare&&<div className="flex items-end gap-3 flex-wrap">
              {Frac("移転持分（任意）",p.mnum,p.mden,v=>upB(i,"mnum",v),v=>upB(i,"mden",v),"#7c3aed")}
              <div className="flex-1 text-right" style={{minWidth:110}}><div className="text-[10px]" style={{color:"#8393a7"}}>登記評価額</div><div className="text-sm font-bold" style={{color:"#1a2233",fontVariantNumeric:"tabular-nums"}}>{fmt(Math.floor(bv(p)))}</div></div>
            </div>}
          </div>
        ))}
        <button onClick={()=>setBldgs(a=>[...a,{val:"",mnum:"",mden:""}])} className="text-xs py-2 px-3 rounded-lg font-medium mb-4" style={{color:"#b45309",background:"#fffbeb",border:"1.5px dashed #fde68a"}}>＋ 建物を追加</button>

        <div className="rounded-xl p-3 mb-4" style={{background:"#eef2ff"}}>
          <div className="flex justify-between text-sm mb-1"><span style={{color:"#566275"}}>土地 評価額合計</span><span className="font-bold" style={{color:"#1d4ed8",fontVariantNumeric:"tabular-nums"}}>{fmt(landSum)}</span></div>
          <div className="flex justify-between text-sm"><span style={{color:"#566275"}}>建物 評価額合計</span><span className="font-bold" style={{color:"#b45309",fontVariantNumeric:"tabular-nums"}}>{fmt(bldgSum)}</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{background:"#f0f3f8",color:"#566275"}}>キャンセル</button>
          <button onClick={()=>onApply(landSum,bldgSum,lands,bldgs)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{background:"#4338ca",color:"#fff"}}>評価額合計に転記</button>
        </div>
      </div>
    </div>
  );
}

// ── Card ──
function Card({item,index,onUpdate,onRemove,g,scTotal=0}){
  const u=p=>onUpdate({...item,...p});const r=calcItem(item,g);const dispFee=index===0?r.fee+scTotal:r.fee;
  const needDA=["mortgage","rootMortgage"].includes(item.type);
  const dM=Math.ceil((item.debtAmount||0)/10000);
  const cl={transfer:"#2563eb",preservation:"#059669",mortgage:"#d97706",rootMortgage:"#dc2626",deletion:"#6b7280",addressChange:"#6b7280"};
  const[showTaxProc,setShowTaxProc]=useState(false);
  const[showShiki,setShowShiki]=useState(false);
  const printSheet=()=>{
    const lraw=Number(item.landValue)||0,braw=Number(item.buildingValue)||0;
    const lb=lraw>0?f1(lraw):0,bb=braw>0?f1(braw):0;
    const lr=r.txd.lr||15/1000,br=r.txd.br||20/1000;
    const lt=r.txd.lt||0,bt=r.txd.bt||0,total=r.tax;
    const lands=(item.shiki?.lands||[]).filter(p=>Number(p.price)>0);
    const blds=(item.shiki?.buildings||[]).filter(p=>Number(p.val)>0);
    const yen=n=>"¥"+Math.round(n).toLocaleString();
    const lvv=p=>{const pr=Number(p.price)||0,n=Number(p.num)||0,d=Number(p.den)||0,mn=Number(p.mnum)||0,md=Number(p.mden)||0;let v=(n>0&&d>0)?pr/d*n:pr;if(p.road)v=v*0.3;if(mn>0&&md>0)v=v*mn/md;return Math.floor(v);};
    const bvv=p=>{const v=Number(p.val)||0,mn=Number(p.mnum)||0,md=Number(p.mden)||0;return Math.floor((mn>0&&md>0)?v*mn/md:v);};
    const shareTxt=p=>{const a=[];if(p.road)a.push("公衆用道路×0.3");if(Number(p.num)>0&&Number(p.den)>0)a.push(`敷地権 ${Number(p.num)}/${Number(p.den)}`);if(Number(p.mnum)>0&&Number(p.mden)>0)a.push(`移転 ${Number(p.mnum)}/${Number(p.mden)}`);return a.length?a.join("　"):"—";};
    const hasMochi=lands.some(p=>Number(p.num)>0&&Number(p.den)>0);
    const hasLShare=lands.some(p=>p.road||(Number(p.num)>0&&Number(p.den)>0)||(Number(p.mnum)>0&&Number(p.mden)>0));
    const hasBShare=blds.some(p=>Number(p.mnum)>0&&Number(p.mden)>0);
    const landRows=lands.map((p,i)=>hasLShare?`<tr><td>土地${i+1}</td><td class=r>${(Number(p.price)||0).toLocaleString()}</td><td class=c>${shareTxt(p)}</td><td class=r>${yen(lvv(p))}</td></tr>`:`<tr><td>土地${i+1}</td><td class=r>${yen(Number(p.price)||0)}</td></tr>`).join("");
    const bldRows=blds.map((p,i)=>hasBShare?`<tr><td>建物${i+1}</td><td class=r>${(Number(p.val)||0).toLocaleString()}</td><td class=c>${shareTxt(p)}</td><td class=r>${yen(bvv(p))}</td></tr>`:`<tr><td>建物${i+1}</td><td class=r>${yen(Number(p.val)||0)}</td></tr>`).join("");
    const landTable=lands.length?(hasLShare?`<table><thead><tr><th>区分</th><th>評価額</th><th>持分・補正</th><th>登記評価額</th></tr></thead><tbody>${landRows}</tbody></table>`:`<table><thead><tr><th>区分</th><th>評価額</th></tr></thead><tbody>${landRows}</tbody></table>`):"";
    const bldTable=blds.length?(hasBShare?`<table><thead><tr><th>区分</th><th>評価額</th><th>持分・補正</th><th>登記評価額</th></tr></thead><tbody>${bldRows}</tbody></table>`:`<table><thead><tr><th>区分</th><th>評価額</th></tr></thead><tbody>${bldRows}</tbody></table>`):"";
    const isSale=item.causeType==="sale";
    const cause=item.causeType==="inheritance"?"相続":item.causeType==="gift"?"贈与・財産分与等":"売買";
    const combined=lraw+braw,cbase=f1(combined),rate=lr;
    const saleLandSec=lraw>0?`<h2>土地${hasMochi?"（敷地権）":""}</h2>${landTable}<div class=sum><span>評価額合計</span><b>${yen(lraw)}</b></div><div class=sum><span>課税標準①（千円未満切捨）</span><b>${lb.toLocaleString()}</b></div><div class=sum><span>土地の登録免許税　①×${lr*1000}/1000　②</span><b>${yen(lt)}</b></div>`:"";
    const saleBldSec=braw>0?`<h2>建物</h2>${bldTable}<div class=sum><span>評価額合計</span><b>${yen(braw)}</b></div><div class=sum><span>課税標準③（千円未満切捨）</span><b>${bb.toLocaleString()}</b></div><div class=sum><span>建物の登録免許税　③×${br*1000}/1000　④</span><b>${yen(bt)}</b></div>`:"";
    const saleBody=`${saleLandSec}${saleBldSec}<div class=tot><span>登録免許税合計（${(lraw>0&&braw>0)?"②＋④・":""}百円未満切捨）</span><span>${yen(total)}</span></div>`;
    const combLandSec=lraw>0?`<h2>土地${hasMochi?"（敷地権）":""}</h2>${landTable}<div class=sum><span>土地 評価額合計</span><b>${yen(lraw)}</b></div>`:"";
    const combBldSec=braw>0?`<h2>建物</h2>${bldTable}<div class=sum><span>建物 評価額合計</span><b>${yen(braw)}</b></div>`:"";
    const combBody=`${combLandSec}${combBldSec}<div class=sum><span>評価額合計${(lraw>0&&braw>0)?"（土地＋建物）":""}</span><b>${yen(combined)}</b></div><div class=sum><span>課税標準（千円未満切捨）</span><b>${cbase.toLocaleString()}</b></div><div class=tot><span>登録免許税（課税標準×${rate*1000}/1000・百円未満切捨）</span><span>${yen(total)}</span></div>`;
    const exemptSum=r.txd.exemptSum||0,taxLand=(r.txd.taxLand!=null?r.txd.taxLand:lraw),cbaseInh=(taxLand+braw)>0?f1(taxLand+braw):0;
    const landRowsInh=lands.map((p,i)=>{const v=lvv(p);const ex=v<=1000000;return hasLShare?`<tr><td>土地${i+1}</td><td class=r>${(Number(p.price)||0).toLocaleString()}</td><td class=c>${shareTxt(p)}</td><td class=r>${yen(v)}</td><td class=c>${ex?"非課税":"課税"}</td></tr>`:`<tr><td>土地${i+1}</td><td class=r>${yen(v)}</td><td class=c>${ex?"非課税":"課税"}</td></tr>`;}).join("");
    const landTableInh=lands.length?(hasLShare?`<table><thead><tr><th>区分</th><th>評価額</th><th>持分・補正</th><th>登記評価額</th><th>判定</th></tr></thead><tbody>${landRowsInh}</tbody></table>`:`<table><thead><tr><th>区分</th><th>評価額</th><th>判定</th></tr></thead><tbody>${landRowsInh}</tbody></table>`):"";
    const inhBldSec=braw>0?`<h2>建物</h2>${bldTable}<div class=sum><span>建物 評価額合計</span><b>${yen(braw)}</b></div>`:"";
    const inhBody=`<h2>土地${hasMochi?"（敷地権）":""}</h2>${landTableInh}<div class=sum><span>土地 評価額合計</span><b>${yen(lraw)}</b></div>${exemptSum>0?`<div class=sum><span>うち非課税（100万円以下の土地）</span><b>−${yen(exemptSum)}</b></div>`:""}<div class=sum><span>課税対象 土地</span><b>${yen(taxLand)}</b></div>${inhBldSec}<div class=sum><span>課税標準（${braw>0?"課税対象土地＋建物・":""}千円未満切捨）</span><b>${cbaseInh.toLocaleString()}</b></div><div class=tot><span>登録免許税（課税標準×4/1000・百円未満切捨）</span><span>${yen(total)}</span></div>${exemptSum>0?`<div style="color:#888;font-size:11px;margin-top:6px">※ 100万円以下の土地は非課税（租税特別措置法84条の2の3第2項）</div>`:""}`;
    const html=`<!doctype html><html lang=ja><head><meta charset=utf-8><title>登録免許税計算シート</title><style>*{box-sizing:border-box}body{font-family:'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;color:#1a2233;margin:28px;font-size:13px}h1{font-size:17px;text-align:center;letter-spacing:.18em;margin:0 0 2px}.cause{text-align:center;color:#555;font-size:12px;margin-bottom:14px}h2{font-size:13px;background:#eef2ff;padding:5px 9px;border-left:4px solid #4338ca;margin:16px 0 6px}table{width:100%;border-collapse:collapse;margin-bottom:6px}td,th{border:1px solid #d7dbe3;padding:5px 8px}th{background:#f4f6fb;font-weight:600;font-size:12px}.r{text-align:right;font-variant-numeric:tabular-nums}.c{text-align:center}.sum{display:flex;justify-content:space-between;padding:3px 9px}.sum b{font-variant-numeric:tabular-nums}.tot{margin-top:10px;padding:9px 12px;border:2px solid #4338ca;border-radius:6px;display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#4338ca}@media print{body{margin:14mm}}</style></head><body><h1>登録免許税計算シート</h1><div class=cause>原因：${cause}</div>${isSale?saleBody:(item.causeType==="inheritance"?inhBody:combBody)}<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
    const w=window.open("","_blank","width=820,height=900");
    if(!w){alert("印刷ウィンドウを開けませんでした。ブラウザのポップアップ許可をご確認ください。");return;}
    w.document.write(html);w.document.close();
  };
  return(
    <div className="rounded-xl p-5 mb-4" style={{background:"#fff",border:"1px solid #e5e9f0",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2"><div className="w-1.5 h-6 rounded-full" style={{background:cl[item.type]}} />
          <span className="text-sm font-bold" style={{color:cl[item.type]}}>{itemLabel(item)} #{index+1}</span></div>
        <button onClick={onRemove} className="text-xs px-2 py-1 rounded hover:bg-red-50" style={{color:"#e53e3e"}}>削除</button></div>
      <div className="grid grid-cols-2 gap-x-3">
        <Sel label="登記種別" value={item.type} onChange={v=>u({type:v})} options={[
          {value:"transfer",label:"所有権移転"},{value:"preservation",label:"所有権保存"},
          {value:"mortgage",label:"抵当権設定"},{value:"rootMortgage",label:"根抵当権設定"},
          {value:"deletion",label:"（根）抵当権抹消"},{value:"addressChange",label:"所有権登記名義人住所変更"},
        ]} />
        <Inp label="不動産の個数" value={item.propCount} onChange={v=>u({propCount:v})} min={1} step={1} suffix="個" />
      </div>
      {item.type==="transfer"&&<>
        <Sel label="原因" value={item.causeType} onChange={v=>u({causeType:v})} options={[
          {value:"sale",label:"売買"},{value:"inheritance",label:"相続（4/1000）"},{value:"gift",label:"贈与・財産分与等（20/1000）"},
        ]} />
        <div className="p-3 rounded-lg mb-3" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>
          <p className="text-xs font-bold mb-2" style={{color:"#1d4ed8"}}>土地・建物の評価額を分けて入力</p>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button onClick={()=>setShowShiki(true)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{color:"#4338ca",background:"#eef2ff",border:"1px solid #c7d2fe"}}>🏢 土地・建物の内訳を入力（敷地権対応）</button>
            {(item.shiki?.lands?.some(p=>Number(p.price)>0)||item.shiki?.buildings?.some(p=>Number(p.val)>0))&&<span className="text-[10px]" style={{color:"#10b981"}}>✓ 内訳で計算済み</span>}
          </div>
          <Inp label="土地の評価額合計" value={item.landValue} onChange={v=>u({landValue:v})} suffix="円" placeholder="例: 10000000" />
          <Inp label="建物の評価額合計" value={item.buildingValue} onChange={v=>u({buildingValue:v})} suffix="円" placeholder="例: 5000000" />
          {(item.landValue||item.buildingValue)&&<div className="text-xs mt-1 p-2 rounded" style={{background:"#dbeafe",color:"#1e40af"}}>報酬テーブル: 合計 {fmtM(Math.ceil(((item.landValue||0)+(item.buildingValue||0))/10000))}区分</div>}
        </div>
      </>}
      {item.type==="preservation"&&<Inp label="課税標準額（固定資産評価額）" value={item.taxableValue} onChange={v=>u({taxableValue:v})} suffix="円"
        note={item.taxableValue?`→ ${fmtM(Math.ceil(item.taxableValue/10000))}区分`:""} />}
      {needDA&&<div className="p-3 rounded-lg mb-3" style={{background:"#fffbeb",border:"1px solid #fde68a"}}>
        <Inp label={item.type==="rootMortgage"?"★ 極度額":"★ 債権金額"} value={item.debtAmount} onChange={v=>u({debtAmount:v})} suffix="円" placeholder="例: 30000000"
          note={item.debtAmount?`→ ${fmtM(dM)}区分`:"報酬・登免税ともにこの金額ベース"} />
      </div>}
      <div className="mt-2 pt-3" style={{borderTop:"1px dashed #dce1ea"}}>
        <Rw label="報酬（税抜）" value={fmt(dispFee)} bold />
        <Rw label={r.isSimpleType?`　基本（${r.col}）`:`　基本（${r.col} / ${fmtM(r.lv)}）`} value={fmt(r.fb)} sub />
        {r.ep>0&&<Rw label={`　不動産加算 (${(item.propCount||1)-1}個×${r.propAddUnit.toLocaleString()})`} value={fmt(r.ep)} sub />}
        {scTotal>0&&index===0&&<Rw label="　加算" value={fmt(scTotal)} sub />}
        <div className="flex justify-between items-center py-1.5" style={{borderBottom:"1px solid #edf0f5"}}>
          <span className="text-sm font-medium" style={{color:"#3a4557"}}>登録免許税</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{color:"#1a2233",fontVariantNumeric:"tabular-nums"}}>{fmt(r.tax)}</span>
            {r.txd.steps.length>0&&<button onClick={()=>setShowTaxProc(!showTaxProc)} className="text-xs px-1.5 py-0.5 rounded"
              style={{background:showTaxProc?"#fef3c7":"#f0f3f8",color:showTaxProc?"#92400e":"#8393a7",border:"1px solid "+(showTaxProc?"#fde68a":"#dce1ea")}}>
              {showTaxProc?"▲ 閉じる":"▼ 計算過程"}</button>}
          </div>
        </div>
        {showTaxProc&&r.txd.steps.length>0&&(
          <div className="p-2.5 rounded-lg mt-1 mb-1" style={{background:"#fffbeb",border:"1px solid #fde68a"}}>
            {r.txd.steps.map((s,i)=>(
              <div key={i} className="mb-1.5 last:mb-0">
                <span className="text-xs font-medium" style={{color:"#92400e"}}>{s.l}：</span>
                <span className="text-xs" style={{color:"#78350f",fontVariantNumeric:"tabular-nums"}}>{s.v}</span>
              </div>
            ))}
            {item.type==="transfer"&&(
              <button onClick={printSheet} className="text-xs mt-2 px-2.5 py-1 rounded-lg font-medium" style={{color:"#4338ca",background:"#fff",border:"1px solid #c7d2fe"}}>🖨 登録免許税計算シートを印刷</button>
            )}
          </div>
        )}
        <Rw label="小計" value={fmt(dispFee+r.tax)} hl bold />
      </div>
      {showShiki&&<ShikiModal initialLands={item.shiki?.lands||(item.landValue?[{price:item.landValue,num:"",den:""}]:undefined)} initialBuildings={item.shiki?.buildings||(item.buildingValue?[{val:item.buildingValue}]:undefined)} onApply={(ls,bs,lands,bldgs)=>{u({landValue:ls,buildingValue:bs,shiki:{lands,buildings:bldgs}});setShowShiki(false);}} onClose={()=>setShowShiki(false)} />}
    </div>);
}

// クリップボードへコピー（httpsでない環境や旧ブラウザ向けにtextareaでフォールバック）
async function copyToClipboard(text){
  try{
    if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}
  }catch{}
  try{
    const ta=document.createElement("textarea");
    ta.value=text;ta.setAttribute("readonly","");
    ta.style.position="fixed";ta.style.top="-1000px";ta.style.opacity="0";
    document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,ta.value.length);
    const ok=document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }catch{return false;}
}

// ── 明細（画面表示用の内訳） ──
function Meisai({items,g,scTotal,rows,stdItems,rate}){
  const m=buildMeisai(items,g,scTotal,rows,stdItems,rate);
  const{regLines,feeRows,regTax,jippiTotal,feeExcl,consumptionTax,feeIncl,grand}=m;
  const[copied,setCopied]=useState("");
  const doCopy=async()=>{
    const d=new Date();
    const tsv=meisaiToTSV(m,rate,{billingDate:`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`});
    const ok=await copyToClipboard(tsv);
    setCopied(ok?"ok":"ng");
    setTimeout(()=>setCopied(""),2000);
  };
  return(
    <div className="rounded-xl p-5 mb-4" style={{background:"linear-gradient(135deg,#4338ca,#3730a3)",color:"#fff",boxShadow:"0 4px 16px rgba(67,56,202,0.25)"}}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{color:"rgba(255,255,255,0.7)"}}>ご請求明細</h3>
        <button onClick={doCopy} title="帳票ソフト貼り付け用のタブ区切りテキストをコピーします（顧客名・振込先は空欄）"
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap"
          style={{background:copied==="ok"?"rgba(16,185,129,0.9)":copied==="ng"?"rgba(239,68,68,0.9)":"rgba(255,255,255,0.15)",
            color:"#fff",border:"1px solid rgba(255,255,255,0.35)"}}>
          {copied==="ok"?"✓ コピーしました":copied==="ng"?"× コピーできません":"📋 明細をコピー"}
        </button>
      </div>

      <table className="w-full" style={{borderCollapse:"collapse"}}>
        <thead>
          <tr style={{borderBottom:"1.5px solid rgba(255,255,255,0.3)"}}>
            <th className="text-left text-xs font-bold pb-1.5" style={{color:"rgba(255,255,255,0.7)"}}>項目</th>
            <th className="text-right text-xs font-bold pb-1.5 pl-3 whitespace-nowrap" style={{color:"rgba(255,255,255,0.85)"}}>報酬</th>
            <th className="text-right text-xs font-bold pb-1.5 pl-3 whitespace-nowrap" style={{color:"#fde68a"}}>登免税・実費</th>
          </tr>
        </thead>
        <tbody>
          {regLines.map(({it,c,fee,addSc},i)=>(
            <tr key={`reg-${i}`} style={{borderBottom:"1px solid rgba(255,255,255,0.12)"}}>
              <td className="py-1.5 align-top" style={{minWidth:0}}>
                <div className="text-sm" style={{color:"#fff"}}>{itemLabel(it)}</div>
                <div className="text-xs mt-0.5" style={{color:"rgba(255,255,255,0.6)"}}>
                  {c.isSimpleType?`基本（${c.col}）`:`基本（${c.col}/${fmtM(c.lv)}）`} {fmt(c.fb)}
                  {c.ep>0&&`　＋不動産加算 ${fmt(c.ep)}`}
                  {addSc>0&&`　＋加算 ${fmt(addSc)}`}
                </div>
              </td>
              <td className="text-right text-sm align-top py-1.5 pl-3 whitespace-nowrap" style={{fontVariantNumeric:"tabular-nums",color:"#fff"}}>{fmt(fee)}</td>
              <td className="text-right text-sm align-top py-1.5 pl-3 whitespace-nowrap" style={{fontVariantNumeric:"tabular-nums",color:"#fde68a"}}>{c.tax>0?fmt(c.tax):"—"}</td>
            </tr>
          ))}
          {feeRows.map((r,i)=>(
            <tr key={`fee-${i}`} style={{borderBottom:"1px solid rgba(255,255,255,0.12)"}}>
              <td className="py-1.5 text-sm align-top" style={{color:"#fff"}}>{r.name}</td>
              <td className="text-right text-sm align-top py-1.5 pl-3 whitespace-nowrap" style={{fontVariantNumeric:"tabular-nums",color:"#fff"}}>{r.fee>0?fmt(r.fee):"—"}</td>
              <td className="text-right text-sm align-top py-1.5 pl-3 whitespace-nowrap" style={{fontVariantNumeric:"tabular-nums",color:"#fde68a"}}>{r.jippi>0?fmt(r.jippi):"—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 pt-3" style={{borderTop:"1px solid rgba(255,255,255,0.2)"}}>
        {[["報酬（税抜）",fmt(feeExcl),false],[`消費税（${rate}%）`,fmt(consumptionTax),false],["報酬（税込）",fmt(feeIncl),true],["登録免許税",fmt(regTax),false],...(jippiTotal>0?[["実費・立替金（非課税）",fmt(jippiTotal),false]]:[])].map(([l,v,b],i)=>(
          <div key={i} className="flex justify-between items-baseline mb-1">
            <span className="text-sm" style={{color:b?"#fff":"rgba(255,255,255,0.75)",fontWeight:b?700:400}}>{l}</span>
            <span className="text-sm" style={{color:"#fff",fontWeight:b?700:500,fontVariantNumeric:"tabular-nums"}}>{v}</span>
          </div>
        ))}
        <div className="flex justify-between items-baseline mt-2 pt-3" style={{borderTop:"1px solid rgba(255,255,255,0.2)"}}>
          <span className="font-bold" style={{color:"#fff"}}>合計請求額</span>
          <span className="text-2xl font-bold" style={{color:"#fff",fontVariantNumeric:"tabular-nums"}}>{fmt(grand)}</span>
        </div>
      </div>
    </div>);
}

// ══════════════════════════════════════════════════════
export default function App(){
  const mk=t=>({type:t,causeType:"sale",landValue:"",buildingValue:"",taxableValue:"",debtAmount:"",propCount:2});
  const[items,setItems]=useState([mk("transfer"),mk("mortgage")]);
  const[rate,setRate]=useState(10);
  const[rows,setRows]=useState([
    {kind:"std",stdId:"cert",count:0},
    {kind:"std",stdId:"info",count:0},
    {kind:"postage",amount:2400},
  ]);
  const updateRow=(idx,patch)=>setRows(p=>p.map((r,i)=>i===idx?{...r,...patch}:r));
  const removeRow=(idx)=>setRows(p=>p.filter((_,i)=>i!==idx));
  const moveRow=(idx,dir)=>{const j=idx+dir;setRows(p=>{if(j<0||j>=p.length)return p;const n=[...p];[n[idx],n[j]]=[n[j],n[idx]];return n;});};
  const counts=useMemo(()=>{const c={};rows.forEach(r=>{if(r.kind==="std")c[r.stdId]=r.count||0;});return c;},[rows]);
  const postage=useMemo(()=>(rows.find(r=>r.kind==="postage")||{}).amount||0,[rows]);
  const extras=useMemo(()=>rows.filter(r=>r.kind==="extra"),[rows]);
  const[showCfg,setShowCfg]=useState(false);
  const[housingCert,setHC]=useState("none");
  const[ft,setFt]=useState(()=>DEF_FT.map(r=>[...r]));
  const[unit,setUnit]=useState({...DEF_UNIT});
  const[surcharges,setSurcharges]=useState(()=>DEF_SURCHARGES.map(s=>({...s})));
  const[stdItems,setStdItems]=useState(()=>DEF_STD_ITEMS.map(s=>({...s})));
  const[enabledSc,setEnabledSc]=useState({});
  const[commonOpen,setCommonOpen]=useState(true);

  useEffect(()=>{try{const r=localStorage.getItem(CFG_KEY);if(r){const d=JSON.parse(r);if(d.ft)setFt(d.ft);if(d.unit)setUnit(u=>({...u,...d.unit}));if(Array.isArray(d.surcharges))setSurcharges(d.surcharges.filter(s=>s&&!REMOVED_SC_IDS.includes(s.id)));if(Array.isArray(d.stdItems))setStdItems(d.stdItems.filter(si=>si&&si.id&&si.name).map(si=>si.id==="info"&&si.jippi===331?{...si,jippi:330}:si));if(typeof d.rate==="number")setRate(d.rate);}}catch{};},[]);
  useEffect(()=>{try{localStorage.setItem(CFG_KEY,JSON.stringify({ft,unit,surcharges,stdItems,rate}));}catch{};},[ft,unit,surcharges,stdItems,rate]);

  const hasTr=items.some(i=>i.type==="transfer");
  const hasMtg=items.some(i=>["mortgage","rootMortgage"].includes(i.type));
  const se={counts,postage};
  const g={hasTr,hasMtg,enabledSc,surcharges,housingCert,se,ft,unit,stdItems,counts};

  const expList=useMemo(()=>getExpList(counts,stdItems,postage,extras),[counts,stdItems,postage,extras]);
  const xfee=useMemo(()=>getXFee(counts,stdItems,extras),[counts,stdItems,extras]);
  const scTotal=useMemo(()=>surcharges.reduce((s,sc)=>s+(enabledSc[sc.id]?sc.amount:0),0),[surcharges,enabledSc]);

  const autoLabel=hasTr&&hasMtg?"移転＋設定 → 移転(設定有) / 抵当権設定テーブル"
    :hasTr?"移転のみ → 移転(設定無)テーブル"
    :hasMtg?"設定のみ → 抵当権(設定のみ)テーブル":"—";

  const toggleSc=id=>setEnabledSc(p=>({...p,[id]:!p[id]}));

  const addFromTemplate=(siId)=>{
    const si=stdItems.find(s=>s.id===siId);
    if(si)setRows(p=>[...p,{kind:"extra",name:si.name,fee:String(si.fee),expense:String(si.jippi)}]);
  };

  return(
    <div style={{fontFamily:"'Noto Sans JP',sans-serif"}}>

      {/* ── メイン2カラム ── */}
      <main style={{maxWidth:1400,display:"grid",gridTemplateColumns:"1fr 1fr",gap:28,alignItems:"start"}} className="mx-auto px-8 py-6">
        {/* ── 左カラム: 共通設定 + 取引項目 ── */}
        <div style={{minWidth:0}}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold" style={{color:"#1a2233"}}>取引項目</h2>
            <div className="flex gap-2">
              <button onClick={()=>setShowCfg(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{background:"#fff",border:"1.5px solid #c7d2fe",color:"#4338ca"}}>設定</button>
            </div>
          </div>
          <div className="rounded-xl p-5 mb-5" style={{background:"#fff",border:"1.5px solid #c7d2fe",boxShadow:"0 2px 8px rgba(99,102,241,0.08)"}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{color:"#4338ca"}}>共通設定</h3>
              <button onClick={()=>setCommonOpen(!commonOpen)} className="text-xs px-2 py-0.5 rounded" style={{color:"#4338ca",background:"#eef2ff"}}>
                {commonOpen?"折りたたむ":"展開"}</button>
            </div>
            {commonOpen?<>
              <div className="text-xs mb-3 px-2 py-1.5 rounded-lg" style={{background:"#eef2ff",color:"#4338ca"}}>{autoLabel}</div>
              <div className="flex flex-wrap gap-x-6">
                {surcharges.map(s=>s.name&&(
                  <Chk key={s.id} label={`${s.name}（+${s.amount.toLocaleString()}円）`}
                    checked={!!enabledSc[s.id]} onChange={()=>toggleSc(s.id)} accent="#f59e0b" />
                ))}
              </div>
              <Sel label="住宅用家屋証明書" value={housingCert} onChange={setHC} options={[
                {value:"none",label:"なし（原則税率）"},
                {value:"general",label:"一般住宅（移転3/1000・保存1.5/1000・設定1/1000）"},
                {value:"premium",label:"長期優良・低炭素（移転1/1000・保存1/1000・設定1/1000）"},
              ]} />
            </>:<div className="text-xs" style={{color:"#4338ca"}}>{surcharges.filter(s=>s.name&&enabledSc[s.id]).map(s=>s.name).join("・")||"加算なし"} / {housingCert==="none"?"家屋証明なし":housingCert==="general"?"一般住宅":"長期優良"}</div>}
          </div>

          {items.map((it,i)=><Card key={i} item={it} index={i} g={g} scTotal={scTotal} onUpdate={ni=>setItems(p=>p.map((x,j)=>j===i?ni:x))} onRemove={()=>setItems(p=>p.filter((_,j)=>j!==i))} />)}
          <div className="flex gap-2 mb-5 flex-wrap">
            {[["transfer","＋移転"],["preservation","＋保存"],["mortgage","＋抵当権"],["rootMortgage","＋根抵当"],["deletion","＋抹消"],["addressChange","＋住変"]].map(([t,l])=>(
              <button key={t} onClick={()=>setItems(p=>[...p,mk(t)])} className="py-2 px-3 rounded-xl text-xs font-medium hover:shadow-md"
                style={{background:"#fff",border:"1.5px dashed #c5cdd8",color:"#5a6577"}}>{l}</button>
            ))}
          </div>
        </div>

        {/* ── 右カラム: 実費 + 消費税 + 合計（sticky） ── */}
        <div style={{position:"sticky",top:60,minWidth:0}}>
          <h2 className="text-base font-bold mb-5" style={{color:"#1a2233"}}>費用明細</h2>
          <div className="rounded-xl p-5 mb-4" style={{background:"#fff",border:"1px solid #e5e9f0"}}>
            <h3 className="text-sm font-bold mb-3" style={{color:"#4338ca"}}>謄本・情報 / 実費</h3>
            {rows.map((row,idx)=>{
              const arrows=(<div className="flex flex-col flex-shrink-0" style={{gap:0,marginRight:6}}>
                <button onClick={()=>moveRow(idx,-1)} disabled={idx===0} className="text-xs leading-none px-0.5" style={{color:idx===0?"#d1d5db":"#4338ca",background:"none",border:"none",cursor:idx===0?"default":"pointer"}}>▲</button>
                <button onClick={()=>moveRow(idx,1)} disabled={idx>=rows.length-1} className="text-xs leading-none px-0.5" style={{color:idx>=rows.length-1?"#d1d5db":"#4338ca",background:"none",border:"none",cursor:idx>=rows.length-1?"default":"pointer"}}>▼</button>
              </div>);
              if(row.kind==="std"){
                const si=stdItems.find(s=>s.id===row.stdId);if(!si)return null;const c=row.count||0;
                return(<div key={idx} className="py-2.5 flex items-center" style={{borderBottom:"1px solid #f0f3f8"}}>
                  {arrows}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3" style={{flexWrap:"nowrap"}}>
                      <span className="text-sm flex-1 min-w-0 truncate" style={{color:"#3a4557"}}>{si.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={()=>updateRow(idx,{count:Math.max(0,c-1)})} className="w-7 h-7 rounded-lg flex items-center justify-center text-base" style={{background:"#f0f3f8",color:c>0?"#3a4557":"#c5cdd8",border:"1px solid #dce1ea"}}>−</button>
                        <input type="number" inputMode="numeric" min={0} value={c} onChange={e=>updateRow(idx,{count:e.target.value===""?0:Math.max(0,Math.floor(Number(e.target.value)||0))})} className="w-10 text-center text-sm font-medium rounded-lg outline-none" style={{background:"#f0f3f8",border:"1px solid #dce1ea",fontVariantNumeric:"tabular-nums",padding:"4px 2px"}} onFocus={e=>{e.target.style.borderColor="#4338ca"}} onBlur={e=>{e.target.style.borderColor="#dce1ea"}} />
                        <button onClick={()=>updateRow(idx,{count:c+1})} className="w-7 h-7 rounded-lg flex items-center justify-center text-base" style={{background:"#f0f3f8",color:"#3a4557",border:"1px solid #dce1ea"}}>+</button>
                        <span className="text-xs w-4 flex-shrink-0" style={{color:"#8393a7"}}>{si.unitLabel}</span>
                      </div>
                    </div>
                    {c>0&&<div className="text-xs mt-1" style={{color:"#8393a7"}}>報酬 @{si.fee.toLocaleString()}円 = {fmt(c*si.fee)}　／　実費 @{si.jippi.toLocaleString()}円 = {fmt(c*si.jippi)}</div>}
                  </div>
                </div>);
              }
              if(row.kind==="postage"){
                return(<div key={idx} className="py-2.5 flex items-center" style={{borderBottom:"1px solid #f0f3f8"}}>
                  {arrows}
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm" style={{color:"#3a4557"}}>郵送費</span>
                    <div className="flex items-center gap-1">
                      <input type="number" value={row.amount} min={0} step={100}
                        onChange={e=>updateRow(idx,{amount:e.target.value===""?0:Number(e.target.value)})}
                        className="w-24 px-2 py-1.5 rounded-lg text-sm text-right outline-none"
                        style={{background:"#f0f3f8",border:"1.5px solid #dce1ea",fontVariantNumeric:"tabular-nums"}}
                        onFocus={e=>{e.target.style.borderColor="#4338ca"}} onBlur={e=>{e.target.style.borderColor="#dce1ea"}} />
                      <span className="text-xs" style={{color:"#8393a7"}}>円</span>
                    </div>
                  </div>
                </div>);
              }
              if(row.kind==="extra"){
                const f=Number(row.fee)||0,x=Number(row.expense)||0;
                const sm=[];if(f>0)sm.push(`報酬 ${fmt(f)}`);if(x>0)sm.push(`立替 ${fmt(x)}`);
                return(<ExtraItem key={idx} item={row} index={idx} total={rows.length}
                  onChange={v=>updateRow(idx,v)}
                  onRemove={()=>removeRow(idx)}
                  onMove={d=>moveRow(idx,d)} />);
              }
              return null;
            })}
            <div className="flex gap-2 mt-2">
              <button onClick={()=>setRows(p=>[...p,{kind:"extra",name:"",fee:"",expense:""}])}
                className="text-xs py-2 px-4 rounded-lg font-medium flex-1"
                style={{color:"#4338ca",background:"#eef2ff",border:"1.5px dashed #c7d2fe"}}>＋ 自由入力</button>
              {stdItems.length>0&&<select value="" onChange={e=>{if(e.target.value)addFromTemplate(e.target.value);}}
                className="text-xs py-2 px-3 rounded-lg font-medium flex-1 cursor-pointer"
                style={{color:"#4338ca",background:"#eef2ff",border:"1.5px dashed #c7d2fe",appearance:"none",
                  backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%234338ca'/%3E%3C/svg%3E")`,
                  backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center"}}>
                <option value="">＋ テンプレートから追加</option>
                {stdItems.map(si=><option key={si.id} value={si.id}>{si.name}（報酬{si.fee.toLocaleString()} / 実費{si.jippi.toLocaleString()}）</option>)}
              </select>}
            </div>
            {(xfee>0||expList.length>0)&&<div className="mt-3 pt-2 space-y-1" style={{borderTop:"1px dashed #dce1ea"}}>
              {xfee>0&&<div className="flex justify-between text-xs"><span style={{color:"#4338ca"}}>報酬小計（税対象）</span><span className="font-bold" style={{color:"#4338ca"}}>{fmt(xfee)}</span></div>}
              {expList.length>0&&<div className="flex justify-between text-xs"><span style={{color:"#92400e"}}>立替金合計</span><span className="font-bold" style={{color:"#92400e"}}>{fmt(expList.reduce((s,e)=>s+e.amount,0))}</span></div>}
            </div>}
          </div>

          <Meisai items={items} g={g} scTotal={scTotal} rows={rows} stdItems={stdItems} rate={rate} />

        </div>

        <p className="text-xs text-center px-4" style={{color:"#a0aec0",gridColumn:"1 / -1"}}>※ 参考値。土地売買15/1000は令和8年3月31日まで。住宅用家屋証明は令和9年3月31日まで。</p>
      </main>
      {showCfg&&<Settings ft={ft} setFt={setFt} unit={unit} setUnit={setUnit} surcharges={surcharges} setSurcharges={setSurcharges} stdItems={stdItems} setStdItems={setStdItems} rate={rate} setRate={setRate} onClose={()=>setShowCfg(false)} />}
    </div>);
}
