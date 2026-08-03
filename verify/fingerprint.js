<script>
/* ══ 동작 지문 ══════════════════════════════════════════════════════
   코드를 어떻게 줄이든 이 값들은 한 글자도 달라지면 안 된다.
   화면(DOM) · 계산(도메인 함수) · 겉모습(computed style) 셋 다 본다. */
const errs=[]; window.addEventListener('error',e=>errs.push(e.message));
window.addEventListener('load',()=>{
 const F={};
 try{
 const h=s=>{let x=5381; for(let i=0;i<s.length;i++) x=((x*33)^s.charCodeAt(i))>>>0; return x.toString(36)};

 F.errs = errs.join('|')||'none';

 /* ① 데이터 — 204건 전부를 정렬해 통째로 지문화 */
 F.data = h(JSON.stringify(requests.map(r=>[r.no,r.camp,r.from,r.to,r.date,r.ch,r.gnb,
   r.cycle,r.offer,r.qty,r.team,r.mk,r.hour,r.status,r.reason,r.note,r.reqAt,r.moved])
   .sort((a,b)=>a[0]-b[0])));
 F.n = requests.length;

 /* ② 계산 — 92일 전부의 잔여·사용량·요약 */
 const days=[]; for(let i=0;i<92;i++) days.push(addDays('2026-07-01',i));
 F.capa = h(JSON.stringify(days.map(d=>[d,bannerRem(d),couponRem(d),
   bannerUsed(d), couponUsed(d),
   appliedOn(d,q=>q.ch.includes('배너')), appliedOn(d,q=>q.offer==='쿠폰')])));

 /* ③ 추천 — 조건 6가지로 돌려 본다 */
 const recs=[];
 [['2026-08-10','2026-08-20',7,['배너'],'없음',10],
  ['2026-09-01','2026-09-30',5,['배너'],'없음',50],
  ['2026-08-05','2026-08-25',3,['배너'],'쿠폰',20],
  ['2026-08-04','2026-08-31',1,['TV팝업'],'없음',100],
  ['2026-09-10','2026-09-20',10,['배너','토스트팝업'],'쿠폰',15],
  ['2026-08-15','2026-08-18',2,['배너'],'없음',200]].forEach(([f,t,dy,ch,of,q])=>{
   Object.assign(draft,{qFrom:f,qTo:t,days:dy,ch,gnb:'홈',cycle:'일회성',offer:of,qty:q});
   recs.push(recTop(3).map(x=>[x.d,x.score.toFixed(6),x.dense,x.rem]));
 });
 F.rec = h(JSON.stringify(recs));

 /* ④ dayCheck — 조건 하나로 92일 전부 */
 Object.assign(draft,{qFrom:'2026-07-01',qTo:'2026-09-30',days:5,ch:['배너'],
   gnb:'홈',cycle:'일회성',offer:'쿠폰',qty:60});
 F.check = h(JSON.stringify(days.map(d=>{const r=dayCheck(draft,d); return [d,r.ok,r.why||'']})));

 /* ⑤ 화면 — 역할·탭 조합마다 DOM 전체와 눈에 보이는 글자 */
 const shots={};
 const cap=k=>{ shots[k+':dom']=h($('page').innerHTML);
                shots[k+':text']=h($('page').innerText.replace(/\s+/g,' ').trim()); };
 draft=EMPTY_DRAFT(); form=EMPTY_FORM();
 role='mkt'; tab='apply'; found=false; calDay=null; openPanel=null; render(); cap('mkt/apply');
 tab='cal'; render(); cap('mkt/cal');
 calDay='2026-08-15'; render(); cap('mkt/day'); calDay=null;
 role='adm'; tab='apply'; render(); cap('adm/apply');
 tab='manage'; render(); cap('adm/manage');
 tab='cal'; render(); cap('adm/cal');

 /* ⑥ 조건을 채운 신청 화면 — 달력·추천·최종 패널이 다 뜬 상태 */
 role='mkt'; tab='apply';
 Object.assign(form,{qFrom:'2026-08-10',qTo:'2026-08-20',days:7,ch:['배너'],
   gnb:'홈',cycle:'일회성',offer:'없음',qty:10});
 Object.assign(draft,form); found=true; render(); cap('mkt/found');
 draft.date='2026-08-15'; render(); cap('mkt/picked');
 F.screens = shots;

 /* ⑦ 팝업 — 상태별로 전부 */
 const pops={};
 const mine=s=>requests.find(r=>r.status===s&&r.team===ME.team&&r.mk===ME.mk);
 const st=s=>requests.find(r=>r.status===s);
 role='mkt'; render();
 ['신청','확정','취소'].forEach(s=>{const r=mine(s)||st(s);
   $('modalSlot').innerHTML=''; cancelModal(r.no,false); pops['mkt:'+s]=h($('modalSlot').innerHTML)});
 $('modalSlot').innerHTML=''; cancelModal(mine('신청').no,true); pops['mkt:취소확인']=h($('modalSlot').innerHTML);
 role='adm'; tab='manage'; render();
 ['신청','조정 필요','확정'].forEach(s=>{
   $('modalSlot').innerHTML=''; admModal(st(s).no); pops['adm:'+s]=h($('modalSlot').innerHTML)});
 $('modalSlot').innerHTML='';
 F.popups = pops;

 /* ⑧ 겉모습 — 주요 요소의 실제 계산된 스타일 */
 role='mkt'; tab='apply'; found=true; render();
 const styleOf=(sel,props)=>{const e=document.querySelector(sel); if(!e) return sel+':없음';
   const s=getComputedStyle(e); return sel+'{'+props.map(p=>p+':'+s[p]).join(';')+'}'};
 const sty=[
   styleOf('.findbtn',['backgroundColor','color','fontSize','padding','borderRadius']),
   styleOf('.pill.primary',['backgroundColor','color','fontSize','padding']),
   styleOf('.pill.ghost',['backgroundColor','color','borderColor']),
   styleOf('.card',['backgroundColor','borderColor','borderRadius','padding']),
   styleOf('body',['fontFamily','fontSize','color','backgroundColor','minWidth']),
   styleOf('.gnb',['height','backgroundColor']),
   styleOf('.tabbar a.on',['color','fontWeight']),
 ];
 tab='cal'; calDay=null; render();
 sty.push(styleOf('.ccell',['height','padding','borderColor']));
 sty.push(styleOf('.calwk',['display']));
 F.style = sty.join(' ;; ');

 /* ⑨ CSS 규칙 수 — 통째로 날아간 규칙이 없는지 */
 let n=0; for(const s of document.styleSheets){ try{ n+=s.cssRules.length }catch(e){} }
 F.cssRules = n;
 F.domNodes = document.querySelectorAll('*').length;

 }catch(e){document.title='ERR::'+e.message+' @ '+(e.stack||'').split('\n')[1];return}
 try{document.title='FP::'+btoa(unescape(encodeURIComponent(JSON.stringify(F))))}catch(e){document.title='ERR::'+e.message}
});
</script>
