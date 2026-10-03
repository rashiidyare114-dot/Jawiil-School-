const $=id=>document.getElementById(id);
const SUBJECTS={
 Primary:["Tarbiyo","Cilmibulsho","Af-Soomaali","Saynis","English","Carabi","Xisaab"],
 Middle:["Xisaab","Saynis","Cilmi bulsho","Tarbiyo","Teknooloji","Carabi","English","Af-Soomaali"],
 Secondary:["Math","Physics","Biology","Chemistry","Arabic","Af-Soomaali","English","Technology","Business","Geography","History","Islamic Study"]
};
const GRADES={Primary:["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8"],Middle:["Form 1","Form 2","Form 3","Form 4"],Secondary:["Form 1","Form 2","Form 3","Form 4"]};
let supa=null, students=[], exams=[], results=[], finance=[];

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function gradeOf(n){n=Number(n)||0;return n>=90?"A+":n>=80?"A":n>=70?"B":n>=60?"C":n>=50?"D":"F"}
function statusOf(n){return Number(n)>=50?"PASS":"FAIL"}
function subjectsFor(level){return SUBJECTS[level]||[]}
function localGet(k){try{return JSON.parse(localStorage.getItem(k)||"[]")}catch{return[]}}
function localSet(k,v){localStorage.setItem(k,JSON.stringify(v))}

async function initDb(){
  if(typeof db!=="undefined") supa=db;
  else if(typeof window.supabase!=="undefined" && typeof SUPABASE_URL!=="undefined" && typeof SUPABASE_ANON_KEY!=="undefined") supa=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  $("connection").textContent=supa?"Database: Connected":"Database: Local mode";
  $("connection").className="connection "+(supa?"ok":"error");
}

async function loadAll(){
  if(supa){
    const [s,e,r,f]=await Promise.all([
      supa.from("students").select("*").order("created_at",{ascending:false}),
      supa.from("exams").select("*").order("created_at",{ascending:false}),
      supa.from("results").select("*").order("created_at",{ascending:false}),
      supa.from("finance").select("*").order("created_at",{ascending:false})
    ]);
    const errs=[s,e,r,f].filter(x=>x.error);
    if(errs.length){console.error(errs); throw errs[0].error}
    students=s.data||[];exams=e.data||[];results=r.data||[];finance=f.data||[];
  }else{
    students=localGet("jawiil_students");exams=localGet("jawiil_exams");results=localGet("jawiil_results");finance=localGet("jawiil_finance");
  }
  renderAll();
}

function renderAll(){setupResultFilters();renderStudents();renderResults();renderFinance();updateDashboard()}

function updateDashboard(){
 $("countStudents").textContent=students.length;
 $("countExams").textContent=exams.length;
 $("countResults").textContent=results.length;
 $("totalPaid").textContent=(finance.reduce((a,x)=>a+Number(x.amount_paid||0),0)).toFixed(2);
}

function renderStudents(q=""){
 q=(q||"").toLowerCase();
 const rows=students.filter(x=>(x.student_id+" "+x.full_name+" "+(x.phone||"")+" "+(x.grade||"")).toLowerCase().includes(q));
 $("studentRows").innerHTML=rows.map(x=>`<tr>
 <td>${esc(x.student_id)}</td><td>${esc(x.full_name)}</td><td>${esc(x.level)}</td><td>${esc(x.grade)}</td><td>${esc(x.phone)}</td><td>${esc(x.academic_year)}</td>
 <td><button class="danger" onclick="deleteStudent('${esc(x.student_id)}')">🗑 Delete</button></td>
 </tr>`).join("");
}
function setupResultFilters(){
 const levels=[...new Set(exams.map(x=>x.level).filter(Boolean))].sort();
 const grades=[...new Set(exams.map(x=>x.grade).filter(Boolean))].sort();
 const examNames=[...new Set(exams.map(x=>x.exam_name).filter(Boolean))].sort();
 const fill=(id,items,label)=>{const el=$(id); if(!el)return; const old=el.value; el.innerHTML=`<option value="">${label}</option>`+items.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(""); if(items.includes(old))el.value=old;};
 fill("resultLevelFilter",levels,"All Levels");
 fill("resultGradeFilter",grades,"All Classes");
 fill("resultExamFilter",examNames,"All Exams");
}
function renderResults(q=""){
 q=(q||"").toLowerCase().trim();
 const levelFilter=$("resultLevelFilter")?.value||"";
 const gradeFilter=$("resultGradeFilter")?.value||"";
 const examFilter=$("resultExamFilter")?.value||"";
 const filtered=results.filter(x=>{
   const ex=exams.find(e=>String(e.exam_id)===String(x.exam_id))||{};
   const text=(x.student_id+" "+(x.student_name||"")+" "+(x.exam_id||"")+" "+(x.subject||"")+" "+(ex.exam_name||"")+" "+(ex.level||"")+" "+(ex.grade||"")).toLowerCase();
   return (!q||text.includes(q)) && (!levelFilter||String(ex.level||"")===levelFilter) && (!gradeFilter||String(ex.grade||"")===gradeFilter) && (!examFilter||String(ex.exam_name||"")===examFilter);
 });
 const groups={};
 filtered.forEach(x=>{
   const ex=exams.find(e=>String(e.exam_id)===String(x.exam_id))||{};
   const key=String(x.student_id)+"||"+String(x.exam_id);
   if(!groups[key]) groups[key]={student_id:x.student_id,student_name:x.student_name||"",level:ex.level||"",grade:ex.grade||"",exam_id:x.exam_id,exam_name:ex.exam_name||"",items:{}};
   groups[key].items[x.subject]={marks:x.marks,grade:x.grade,status:x.status};
 });
 const subjects=[...new Set(filtered.map(x=>x.subject).filter(Boolean))];
 const groupValues=Object.values(groups);
 $("resultSummary").textContent=groupValues.length?`${groupValues.length} student/exam result(s) found`:"No results found";
 if(!groupValues.length){$("resultsTableWrap").innerHTML="<p>No results found.</p>";return}
 $("resultsTableWrap").innerHTML=`<table class="horizontal-results"><thead><tr>
 <th>Student ID</th><th>Student</th><th>Level</th><th>Class/Grade</th><th>Exam Name</th><th>Exam ID</th>${subjects.map(s=>`<th>${esc(s)}</th>`).join("")}<th>Average</th><th>Overall</th><th>Action</th>
 </tr></thead><tbody>${groupValues.map(g=>{
   const vals=subjects.map(sub=>g.items[sub]?.marks).filter(v=>v!==undefined&&v!==null).map(Number);
   const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):"";
   const overall=vals.length?(vals.every(m=>m>=50)?"PASS":"FAIL"):"";
   return `<tr><td>${esc(g.student_id)}</td><td>${esc(g.student_name)}</td><td>${esc(g.level)}</td><td>${esc(g.grade)}</td><td>${esc(g.exam_name)}</td><td>${esc(g.exam_id)}</td>`+
     subjects.map(sub=>{const v=g.items[sub];return `<td>${v?`${esc(v.marks)}<br><small>${esc(v.grade||"")} · ${esc(v.status||"")}</small>`:"-"}</td>`}).join("")+ 
     `<td>${avg}</td><td>${overall}</td><td><button class="danger" onclick="deleteExam('${esc(g.exam_id)}')">🗑 Delete</button></td></tr>`;
 }).join("")}</tbody></table>`;
}

function renderFinance(q=""){
 q=(q||"").toLowerCase();
 const rows=finance.filter(x=>(x.student_id+" "+(x.student_name||"")+" "+(x.fee_type||"")).toLowerCase().includes(q));
 $("financeRows").innerHTML=rows.map(x=>`<tr><td>${esc(x.student_name||x.student_id)}</td><td>${esc(x.fee_type)}</td><td>${Number(x.total_fee||0).toFixed(2)}</td><td>${Number(x.amount_paid||0).toFixed(2)}</td><td>${Number(x.balance||0).toFixed(2)}</td><td>${esc(x.payment_date)}</td><td>${esc(x.payment_method)}</td><td><button class="danger" onclick="deleteFinance('${esc(x.id||"")}')">🗑 Delete</button></td></tr>`).join("");
}

function studentById(id){return students.find(x=>String(x.student_id).trim()===String(id).trim())}
function setStudentInfo(prefix,s){
 if(prefix==="exam"){ $("exam_student_name").value=s?.full_name||"";$("exam_level").value=s?.level||"";$("exam_grade").value=s?.grade||""}
 if(prefix==="finance")$("finance_student_name").value=s?.full_name||"";
}

function buildExamSubjects(){
 const level=$("exam_level").value, box=$("examSubjects"), body=$("examSubjectRows");
 const list=subjectsFor(level);
 if(!list.length){box.classList.add("hidden");body.innerHTML="";return}
 body.innerHTML=list.map(sub=>`<tr data-subject="${esc(sub)}"><td><b>${esc(sub)}</b></td><td><input class="total" type="number" value="100" min="1"></td><td><input class="pass" type="number" value="50" min="0"></td><td><input class="marks" type="number" value="" min="0" placeholder="Marks"></td><td class="grade">-</td><td class="status">-</td><td><input class="remarks" placeholder="Remarks"></td></tr>`).join("");
 body.querySelectorAll(".marks").forEach(i=>i.addEventListener("input",()=>{
   const tr=i.closest("tr"), m=Number(i.value), pass=Number(tr.querySelector(".pass").value);
   tr.querySelector(".grade").textContent=i.value===""?"-":gradeOf(m);
   tr.querySelector(".status").textContent=i.value===""?"-":(m>=pass?"PASS":"FAIL");
 }));
 box.classList.remove("hidden");
}

$("student_level").addEventListener("change",()=>{
 const level=$("student_level").value, g=$("student_grade");
 g.innerHTML='<option value="">Class/Grade *</option>'+(GRADES[level]||[]).map(x=>`<option>${x}</option>`).join("");
});
$("registration_date").value=new Date().toISOString().slice(0,10);
$("exam_date").value=new Date().toISOString().slice(0,10);
$("finance_payment_date").value=new Date().toISOString().slice(0,10);

$("studentForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const fd=new FormData(e.target), obj=Object.fromEntries(fd.entries());
 obj.student_id=obj.student_id.trim();
 if(studentById(obj.student_id)){ $("studentMsg").textContent="Student ID-kan hore ayuu u jiraa."; $("studentMsg").className="msg error"; return}
 try{
  if(supa){const {error}=await supa.from("students").insert(obj);if(error)throw error}
  else{students.push({...obj,id:crypto.randomUUID()});localSet("jawiil_students",students)}
  await loadAll(); e.target.reset(); $("registration_date").value=new Date().toISOString().slice(0,10);
  $("studentMsg").textContent="Ardayga si guul leh ayaa loo diiwaangeliyey."; $("studentMsg").className="msg ok";
 }catch(err){console.error(err);$("studentMsg").textContent="Kaydintu way fashilantay: "+err.message;$("studentMsg").className="msg error"}
});
$("studentSearchBtn").onclick=()=>renderStudents($("studentSearch").value);
$("studentSearch").oninput=()=>renderStudents($("studentSearch").value);

$("exam_student_id").addEventListener("input",()=>{
 const s=studentById($("exam_student_id").value); setStudentInfo("exam",s);
 if(s){$("examStudentHint").textContent="Ardayga waa la helay. Maadooyinka waa la soo bandhigay.";$("examStudentHint").className="msg ok";buildExamSubjects()}
 else{$("examStudentHint").textContent="Student ID lama helin."; $("examStudentHint").className="msg error";$("examSubjects").classList.add("hidden")}
});
$("examForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const s=studentById($("exam_student_id").value), eid=$("exam_id").value.trim();
 if(!s)return alert("Marka hore geli Student ID sax ah.");
 if(!eid)return alert("Geli Exam ID.");
 if(exams.some(x=>String(x.exam_id)===eid))return alert("Exam ID-kan hore ayuu u jiraa. Isticmaal Exam ID cusub.");
 const trs=[...document.querySelectorAll("#examSubjectRows tr")];
 if(!trs.length)return alert("Maadooyin lama helin.");
 if(trs.some(tr=>tr.querySelector(".marks").value===""))return alert("Geli marks-ka dhammaan maadooyinka.");
 const examObj={exam_id:eid,exam_name:$("exam_name").value.trim(),student_id:s.student_id,student_name:s.full_name,level:s.level,grade:s.grade,subject:"All Subjects",academic_year:$("exam_year").value,semester:$("semester").value,exam_date:$("exam_date").value,total_marks:100,pass_mark:50};
 const resultObjs=trs.map(tr=>({student_id:s.student_id,student_name:s.full_name,exam_id:eid,subject:tr.dataset.subject,total_marks:Number(tr.querySelector(".total").value||100),marks:Number(tr.querySelector(".marks").value),grade:gradeOf(Number(tr.querySelector(".marks").value)),status:Number(tr.querySelector(".marks").value)>=Number(tr.querySelector(".pass").value)?"PASS":"FAIL",remarks:tr.querySelector(".remarks").value,created_at:new Date().toISOString()}));
 try{
  if(supa){
   let r=await supa.from("exams").insert(examObj); if(r.error)throw r.error;
   r=await supa.from("results").insert(resultObjs); if(r.error)throw r.error;
  }else{
   exams.push({...examObj,id:crypto.randomUUID()});results.push(...resultObjs.map(x=>({...x,id:crypto.randomUUID()})));
   localSet("jawiil_exams",exams);localSet("jawiil_results",results);
  }
  await loadAll(); alert("Exam iyo dhammaan maadooyinkiisa waa la keydiyey."); e.target.reset();$("examSubjects").classList.add("hidden");
 }catch(err){console.error(err);alert("Kaydinta Exam-ka way fashilantay: "+err.message)}
});

$("resultSearchBtn").onclick=()=>renderResults($("resultSearch").value);
$("resultSearch").oninput=()=>renderResults($("resultSearch").value);
["resultLevelFilter","resultGradeFilter","resultExamFilter"].forEach(id=>$(id).addEventListener("change",()=>renderResults($("resultSearch").value)));
$("resultPrintBtn").onclick=()=>{const area=$("resultsTableWrap").innerHTML;if(!area||area.includes("No results found")){alert("Marka hore soo saar natiijooyinka aad rabto inaad print-gareyso.");return;} const w=window.open("","_blank"); if(!w){alert("Browser-ku wuxuu xannibay Print window. Ogolow pop-up kadib mar kale taabo Print.");return;} w.document.write(`<!doctype html><html><head><title>JAWIIL Exam Results</title><style>body{font-family:Arial;padding:20px}h1{color:#173f67}table{width:100%;border-collapse:collapse;min-width:900px}th,td{border:1px solid #999;padding:7px;text-align:left;white-space:nowrap}th{background:#124d80;color:white}small{color:#555}@media print{body{padding:0}button{display:none}}</style></head><body><h1>JAWIIL Primary and Secondary School</h1><h2>Exam Results</h2>${area}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300);};

$("finance_student_id").addEventListener("input",()=>{const s=studentById($("finance_student_id").value);setStudentInfo("finance",s)});
$("finance_total_fee").oninput=$("finance_amount_paid").oninput=()=>{$("finance_balance").value=(Number($("finance_total_fee").value||0)-Number($("finance_amount_paid").value||0)).toFixed(2)};
$("financeForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const sid=$("finance_student_id").value.trim(),s=studentById(sid);
 if(!s)return alert("Student ID lama helin.");
 const obj={transaction_id:$("finance_transaction_id").value.trim(),student_id:sid,student_name:s.full_name,fee_type:$("finance_fee_type").value.trim(),total_fee:Number($("finance_total_fee").value||0),amount_paid:Number($("finance_amount_paid").value||0),balance:Number($("finance_balance").value||0),payment_date:$("finance_payment_date").value,payment_method:$("finance_method").value,receipt_no:$("finance_receipt_no").value.trim(),remarks:$("finance_remarks").value};
 try{
  if(supa){const {error}=await supa.from("finance").insert(obj);if(error)throw error}
  else{finance.push({...obj,id:crypto.randomUUID()});localSet("jawiil_finance",finance)}
  await loadAll();alert("Payment-ka waa la keydiyey.");e.target.reset();$("finance_payment_date").value=new Date().toISOString().slice(0,10);
 }catch(err){console.error(err);alert("Finance kaydintiisu way fashilantay: "+err.message)}
});
$("financeSearchBtn").onclick=()=>renderFinance($("financeSearch").value);
$("financeSearch").oninput=()=>renderFinance($("financeSearch").value);

async function deleteStudent(id){
 if(!confirm("Ma hubtaa inaad tirtirayso ardaygan iyo xogtiisa Exam/Results/Finance?"))return;
 try{
   if(supa){
     let r=await supa.from("results").delete().eq("student_id",id); if(r.error)throw r.error;
     r=await supa.from("exams").delete().eq("student_id",id); if(r.error)throw r.error;
     r=await supa.from("finance").delete().eq("student_id",id); if(r.error)throw r.error;
     r=await supa.from("students").delete().eq("student_id",id); if(r.error)throw r.error;
   }else{
     students=students.filter(x=>String(x.student_id)!==String(id));
     exams=exams.filter(x=>String(x.student_id)!==String(id));
     results=results.filter(x=>String(x.student_id)!==String(id));
     finance=finance.filter(x=>String(x.student_id)!==String(id));
     localSet("jawiil_students",students);localSet("jawiil_exams",exams);localSet("jawiil_results",results);localSet("jawiil_finance",finance);
   }
   await loadAll(); alert("Ardayga iyo xogtiisa waa la tirtiray.");
 }catch(err){alert("Tirtiriddu way fashilantay: "+err.message)}
}
async function deleteExam(examId){
 if(!confirm("Ma hubtaa inaad tirtirayso exam-kan iyo dhammaan maadooyinkiisa?"))return;
 try{
   if(supa){
     let r=await supa.from("results").delete().eq("exam_id",examId);if(r.error)throw r.error;
     r=await supa.from("exams").delete().eq("exam_id",examId);if(r.error)throw r.error;
   }else{
     exams=exams.filter(x=>String(x.exam_id)!==String(examId));
     results=results.filter(x=>String(x.exam_id)!==String(examId));
     localSet("jawiil_exams",exams);localSet("jawiil_results",results);
   }
   await loadAll(); alert("Exam-ka iyo natiijooyinkiisa waa la tirtiray.");
 }catch(err){alert("Tirtiriddu way fashilantay: "+err.message)}
}
async function deleteFinance(id){
 if(!id){alert("Record-kan ID ma laha.");return}
 if(!confirm("Ma hubtaa inaad tirtirayso payment-kan?"))return;
 try{
   if(supa){const {error}=await supa.from("finance").delete().eq("id",id);if(error)throw error}
   else{finance=finance.filter(x=>String(x.id)!==String(id));localSet("jawiil_finance",finance)}
   await loadAll();alert("Payment-ka waa la tirtiray.");
 }catch(err){alert("Tirtiriddu way fashilantay: "+err.message)}
}

document.querySelectorAll(".nav").forEach(btn=>btn.onclick=()=>{async function deleteStudent(id){
 if(!confirm("Ma hubtaa inaad tirtirayso ardaygan iyo xogtiisa Exam/Results/Finance?"))return;
 try{
   if(supa){
     let r=await supa.from("results").delete().eq("student_id",id); if(r.error)throw r.error;
     r=await supa.from("exams").delete().eq("student_id",id); if(r.error)throw r.error;
     r=await supa.from("finance").delete().eq("student_id",id); if(r.error)throw r.error;
     r=await supa.from("students").delete().eq("student_id",id); if(r.error)throw r.error;
   }else{
     students=students.filter(x=>String(x.student_id)!==String(id));
     exams=exams.filter(x=>String(x.student_id)!==String(id));
     results=results.filter(x=>String(x.student_id)!==String(id));
     finance=finance.filter(x=>String(x.student_id)!==String(id));
     localSet("jawiil_students",students);localSet("jawiil_exams",exams);localSet("jawiil_results",results);localSet("jawiil_finance",finance);
   }
   await loadAll(); alert("Ardayga iyo xogtiisa waa la tirtiray.");
 }catch(err){alert("Tirtiriddu way fashilantay: "+err.message)}
}
async function deleteExam(examId){
 if(!confirm("Ma hubtaa inaad tirtirayso exam-kan iyo dhammaan maadooyinkiisa?"))return;
 try{
   if(supa){
     let r=await supa.from("results").delete().eq("exam_id",examId);if(r.error)throw r.error;
     r=await supa.from("exams").delete().eq("exam_id",examId);if(r.error)throw r.error;
   }else{
     exams=exams.filter(x=>String(x.exam_id)!==String(examId));
     results=results.filter(x=>String(x.exam_id)!==String(examId));
     localSet("jawiil_exams",exams);localSet("jawiil_results",results);
   }
   await loadAll(); alert("Exam-ka iyo natiijooyinkiisa waa la tirtiray.");
 }catch(err){alert("Tirtiriddu way fashilantay: "+err.message)}
}
async function deleteFinance(id){
 if(!id){alert("Record-kan ID ma laha.");return}
 if(!confirm("Ma hubtaa inaad tirtirayso payment-kan?"))return;
 try{
   if(supa){const {error}=await supa.from("finance").delete().eq("id",id);if(error)throw error}
   else{finance=finance.filter(x=>String(x.id)!==String(id));localSet("jawiil_finance",finance)}
   await loadAll();alert("Payment-ka waa la tirtiray.");
 }catch(err){alert("Tirtiriddu way fashilantay: "+err.message)}
}

document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));btn.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(btn.dataset.page).classList.add("active")});

$("globalSearchBtn").onclick=()=>{
 const q=$("globalSearch").value.toLowerCase(), rows=students.filter(s=>(s.student_id+" "+s.full_name+" "+(s.phone||"")).toLowerCase().includes(q));
 $("globalSearchOutput").innerHTML=rows.length?`<table><thead><tr><th>Student ID</th><th>Name</th><th>Level</th><th>Class</th><th>Phone</th></tr></thead><tbody>${rows.map(s=>`<tr><td>${esc(s.student_id)}</td><td>${esc(s.full_name)}</td><td>${esc(s.level)}</td><td>${esc(s.grade)}</td><td>${esc(s.phone)}</td></tr>`).join("")}</tbody></table>`:"No student found.";
};

(async()=>{try{await initDb();await loadAll()}catch(e){console.error(e);$("connection").textContent="Database error";$("connection").className="connection error";alert("Database lama akhrin karin: "+e.message)}})();