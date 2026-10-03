const $=id=>document.getElementById(id);

const SUBJECTS={
  Primary:["Tarbiyo","Cilmibulsho","Af-Soomaali","Saynis","English","Carabi","Xisaab"],
  Middle:["Xisaab","Saynis","Cilmi bulsho","Tarbiyo","Teknooloji","Carabi","English","Af-Soomaali"],
  Secondary:["Math","Physics","Biology","Chemistry","Arabic","Af-Soomaali","English","Technology","Business","Geography","History","Islamic Study"]
};
const GRADES={
  Primary:["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8"],
  Middle:["Form 1","Form 2","Form 3","Form 4"],
  Secondary:["Form 1","Form 2","Form 3","Form 4"]
};

let supa=null;
let students=[],exams=[],results=[],finance=[],profiles=[];
let currentProfile=null;

const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const gradeOf=n=>{n=Number(n)||0;return n>=90?"A+":n>=80?"A":n>=70?"B":n>=60?"C":n>=50?"D":"F"};
const subjectsFor=level=>SUBJECTS[level]||[];
const role=()=>currentProfile?.role||"";
const isRole=(...r)=>r.includes(role());

async function initDb(){
  supa=window.supa||((typeof db!=="undefined")?db:null);
  if(!supa) throw new Error("Supabase connection lama helin.");
  const c=$("connection");
  if(c){c.textContent="Database: Connected";c.className="connection ok";}
}

async function loadAll(){
  if(!supa) return;
  const r=role();
  let responses;

  if(r==="admin"){
    responses=await Promise.all([
      supa.from("students").select("*").order("created_at",{ascending:false}),
      supa.from("exams").select("*").order("created_at",{ascending:false}),
      supa.from("results").select("*").order("created_at",{ascending:false}),
      supa.from("finance").select("*").order("created_at",{ascending:false})
    ]);
    students=responses[0].data||[];exams=responses[1].data||[];results=responses[2].data||[];finance=responses[3].data||[];
  }else if(r==="exam_officer"){
    responses=await Promise.all([
      supa.from("students").select("*").order("created_at",{ascending:false}),
      supa.from("exams").select("*").order("created_at",{ascending:false}),
      supa.from("results").select("*").order("created_at",{ascending:false})
    ]);
    students=responses[0].data||[];exams=responses[1].data||[];results=responses[2].data||[];finance=[];
  }else if(r==="treasurer"){
    responses=await Promise.all([
      supa.from("students").select("*").order("created_at",{ascending:false}),
      supa.from("finance").select("*").order("created_at",{ascending:false})
    ]);
    students=responses[0].data||[];finance=responses[1].data||[];exams=[];results=[];
  }else if(r==="student"){
    const sid=String(currentProfile.student_id||"").trim();
    if(!sid) throw new Error("Student ID lama helin.");
    const {data,error}=await supa.rpc("get_student_results", {p_student_id:sid});
    if(error) throw error;
    const payload=data||{};
    if(!payload.student) throw new Error("Student ID-ga lama helin.");
    students=[payload.student];
    exams=payload.exams||[];
    results=payload.results||[];
    finance=[];
  }else{
    throw new Error("Role lama qeexin.");
  }

  const err=responses.find(x=>x.error);
  if(err) throw err.error;

  renderAll();
}

async function startStudentMode(studentId){
  const sid=String(studentId||"").trim();
  if(!sid) throw new Error("Student ID geli.");
  if(!supa) await initDb();
  currentProfile={role:"student",student_id:sid,email:"",full_name:"Student"};
  window.currentProfile=currentProfile;
  if(typeof window.applyRoleVisibility==="function") window.applyRoleVisibility("student");
  if($("userEmail"))$("userEmail").textContent="";
  if($("userRole"))$("userRole").textContent="STUDENT";
  if($("loginScreen"))$("loginScreen").classList.add("hidden");
  if($("resetScreen"))$("resetScreen").classList.add("hidden");
  if($("appShell"))$("appShell").style.display="flex";
  await loadAll();
  if(typeof window.goToRoleStart==="function") window.goToRoleStart("student");
}

function renderAll(){
  setupResultFilters();
  renderStudents();
  renderResults();
  renderFinance();
  updateDashboard();
  if(isRole("admin")) loadProfiles().catch(console.error);
}

function applyRoleDashboard(p){
  currentProfile=p;
  const roleName=p.role;
  const cards=$("dashboardCards");
  const note=$("dashboardNote");
  const search=$("dashboardSearchPanel");
  if(!cards||!note)return;

  if(roleName==="admin"){
    note.textContent="Admin: waxaad maamuli kartaa dhammaan system-ka.";
    cards.innerHTML=`
      <div class="card"><b id="countStudents">0</b><span>Students</span></div>
      <div class="card"><b id="countExams">0</b><span>Exam Entries</span></div>
      <div class="card"><b id="countResults">0</b><span>Results</span></div>
      <div class="card"><b id="totalPaid">0.00</b><span>Total Paid</span></div>`;
    search.style.display="";
  }else if(roleName==="exam_officer"){
    note.textContent="Exam Officer: waxaad arki kartaa oo maamuli kartaa xogta la xiriirta Exam-ka.";
    cards.innerHTML=`
      <div class="card"><b id="countExams">0</b><span>Exam Entries</span></div>
      <div class="card"><b id="countResults">0</b><span>Results</span></div>`;
    search.style.display="";
  }else if(roleName==="treasurer"){
    note.textContent="Treasurer: waxaad arki kartaa oo maamuli kartaa Finance oo keliya.";
    cards.innerHTML=`
      <div class="card"><b id="financeCount">0</b><span>Payments</span></div>
      <div class="card"><b id="totalPaid">0.00</b><span>Total Paid</span></div>`;
    search.style.display="";
  }else{
    // Student has NO dashboard at all.
    search.style.display="none";
  }
}

function updateDashboard(){
  if($("countStudents"))$("countStudents").textContent=students.length;
  if($("countExams"))$("countExams").textContent=exams.length;
  if($("countResults"))$("countResults").textContent=results.length;
  if($("financeCount"))$("financeCount").textContent=finance.length;
  if($("totalPaid"))$("totalPaid").textContent=finance.reduce((a,x)=>a+Number(x.amount_paid||0),0).toFixed(2);
}

function goToRoleStart(r){
  showPage(r==="student"?"results":"dashboard");
}

function showPage(id){
  const page=$(id);
  if(!page)return;
  const allowed=(page.dataset.pageRoles||"").split(",");
  if(!allowed.includes(role()))return;
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  page.classList.add("active");
  document.querySelectorAll(".nav[data-page]").forEach(x=>x.classList.remove("active"));
  const nav=document.querySelector(`.nav[data-page="${id}"]`);
  if(nav)nav.classList.add("active");
}

function renderStudents(q=""){
  const box=$("studentRows");if(!box)return;
  q=(q||"").toLowerCase();
  const rows=students.filter(x=>(x.student_id+" "+x.full_name+" "+(x.phone||"")+" "+(x.grade||"")).toLowerCase().includes(q));
  box.innerHTML=rows.map(x=>`<tr>
    <td>${esc(x.student_id)}</td><td>${esc(x.full_name)}</td><td>${esc(x.level)}</td><td>${esc(x.grade)}</td><td>${esc(x.phone)}</td><td>${esc(x.academic_year)}</td>
    <td>${isRole("admin")?`<button class="danger" onclick="deleteStudent('${esc(x.student_id)}')">🗑 Delete</button>`:""}</td>
  </tr>`).join("");
}

function setupResultFilters(){
  const levels=[...new Set(exams.map(x=>x.level).filter(Boolean))].sort();
  const grades=[...new Set(exams.map(x=>x.grade).filter(Boolean))].sort();
  const examNames=[...new Set(exams.map(x=>x.exam_name).filter(Boolean))].sort();
  const fill=(id,items,label)=>{
    const el=$(id);if(!el)return;
    const old=el.value;
    el.innerHTML=`<option value="">${label}</option>`+items.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    if(items.includes(old))el.value=old;
  };
  fill("resultLevelFilter",levels,"All Levels");
  fill("resultGradeFilter",grades,"All Classes");
  fill("resultExamFilter",examNames,"All Exams");
}

function renderResults(q=""){
  const box=$("resultsTableWrap");if(!box)return;
  q=(q||"").toLowerCase().trim();
  let filtered=results;

  if(isRole("admin","exam_officer")){
    const lf=$("resultLevelFilter")?.value||"";
    const gf=$("resultGradeFilter")?.value||"";
    const ef=$("resultExamFilter")?.value||"";
    filtered=results.filter(x=>{
      const ex=exams.find(e=>String(e.exam_id)===String(x.exam_id))||{};
      const text=(x.student_id+" "+(x.student_name||"")+" "+(x.exam_id||"")+" "+(x.subject||"")+" "+(ex.exam_name||"")+" "+(ex.level||"")+" "+(ex.grade||"")).toLowerCase();
      return (!q||text.includes(q))&&(!lf||String(ex.level||"")===lf)&&(!gf||String(ex.grade||"")===gf)&&(!ef||String(ex.exam_name||"")===ef);
    });
  }else if(isRole("student")){
    // Second client-side guard; RLS is the actual database guard.
    filtered=results.filter(x=>String(x.student_id)===String(currentProfile.student_id));
  }else{
    filtered=[];
  }

  const groups={};
  filtered.forEach(x=>{
    // For students, result rows are already authorized and exams are intentionally not loaded.
    const ex=exams.find(e=>String(e.exam_id)===String(x.exam_id))||{};
    const key=String(x.student_id)+"||"+String(x.exam_id);
    if(!groups[key])groups[key]={
      student_id:x.student_id,
      student_name:x.student_name||"",
      level:ex.level||"",
      grade:ex.grade||"",
      exam_id:x.exam_id,
      exam_name:ex.exam_name||"",
      items:{}
    };
    groups[key].items[x.subject]={marks:x.marks,grade:x.grade,status:x.status};
  });

  const subjects=[...new Set(filtered.map(x=>x.subject).filter(Boolean))];
  const groupValues=Object.values(groups);
  $("resultSummary").textContent=groupValues.length?`${groupValues.length} result(s) found`:"No results found";

  if(!groupValues.length){box.innerHTML="<p>No results found.</p>";return;}

  box.innerHTML=`<table class="horizontal-results"><thead><tr>
    <th>Student ID</th><th>Student</th><th>Level</th><th>Class/Grade</th><th>Exam Name</th><th>Exam ID</th>
    ${subjects.map(s=>`<th>${esc(s)}</th>`).join("")}<th>Average</th><th>Overall</th>${isRole("admin","exam_officer")?"<th>Action</th>":""}
  </tr></thead><tbody>${groupValues.map(g=>{
    const vals=subjects.map(sub=>g.items[sub]?.marks).filter(v=>v!==undefined&&v!==null).map(Number);
    const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):"";
    const overall=vals.length?(vals.every(m=>m>=50)?"PASS":"FAIL"):"";
    return `<tr>
      <td>${esc(g.student_id)}</td><td>${esc(g.student_name)}</td>
      <td>${esc(g.level)}</td><td>${esc(g.grade)}</td>
      <td>${esc(g.exam_name)}</td><td>${esc(g.exam_id)}</td>
      ${subjects.map(sub=>{const v=g.items[sub];return `<td>${v?`${esc(v.marks)}<br><small>${esc(v.grade||"")} · ${esc(v.status||"")}</small>`:"-"}</td>`}).join("")}
      <td>${avg}</td><td>${overall}</td>
      ${isRole("admin","exam_officer")?`<td><button class="danger" onclick="deleteExam('${esc(g.exam_id)}')">🗑 Delete</button></td>`:""}
    </tr>`;
  }).join("")}</tbody></table>`;
}

function renderFinance(q=""){
  const box=$("financeRows");if(!box)return;
  q=(q||"").toLowerCase();
  const rows=finance.filter(x=>(x.student_id+" "+(x.student_name||"")+" "+(x.fee_type||"")).toLowerCase().includes(q));
  box.innerHTML=rows.map(x=>`<tr>
    <td>${esc(x.student_name||x.student_id)}</td><td>${esc(x.fee_type)}</td>
    <td>${Number(x.total_fee||0).toFixed(2)}</td><td>${Number(x.amount_paid||0).toFixed(2)}</td>
    <td>${Number(x.balance||0).toFixed(2)}</td><td>${esc(x.payment_date)}</td><td>${esc(x.payment_method)}</td>
    <td>${isRole("admin","treasurer")?`<button class="danger" onclick="deleteFinance('${esc(x.id||"")}')">🗑 Delete</button>`:""}</td>
  </tr>`).join("");
}

function studentById(id){return students.find(x=>String(x.student_id).trim()===String(id).trim());}

function setStudentInfo(prefix,s){
  if(prefix==="exam"){
    $("exam_student_name").value=s?.full_name||"";
    $("exam_level").value=s?.level||"";
    $("exam_grade").value=s?.grade||"";
  }
  if(prefix==="finance")$("finance_student_name").value=s?.full_name||"";
}

function buildExamSubjects(){
  const list=subjectsFor($("exam_level").value),box=$("examSubjects"),body=$("examSubjectRows");
  if(!list.length){box.classList.add("hidden");body.innerHTML="";return;}
  body.innerHTML=list.map(sub=>`<tr data-subject="${esc(sub)}">
    <td><b>${esc(sub)}</b></td><td><input class="total" type="number" value="100" min="1"></td>
    <td><input class="pass" type="number" value="50" min="0"></td><td><input class="marks" type="number" min="0" placeholder="Marks"></td>
    <td class="grade">-</td><td class="status">-</td><td><input class="remarks" placeholder="Remarks"></td>
  </tr>`).join("");
  body.querySelectorAll(".marks").forEach(i=>i.addEventListener("input",()=>{
    const tr=i.closest("tr"),m=Number(i.value),pass=Number(tr.querySelector(".pass").value);
    tr.querySelector(".grade").textContent=i.value===""?"-":gradeOf(m);
    tr.querySelector(".status").textContent=i.value===""?"-":(m>=pass?"PASS":"FAIL");
  }));
  box.classList.remove("hidden");
}

function today(id){if($(id))$(id).value=new Date().toISOString().slice(0,10);}

function bindEvents(){
  $("student_level").addEventListener("change",()=>{
    const level=$("student_level").value;
    $("student_grade").innerHTML='<option value="">Class/Grade *</option>'+(GRADES[level]||[]).map(x=>`<option>${x}</option>`).join("");
  });
  today("registration_date");today("exam_date");today("finance_payment_date");

  $("studentForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!isRole("admin"))return alert("Admin oo keliya.");
    const obj=Object.fromEntries(new FormData(e.target).entries());
    obj.student_id=obj.student_id.trim();
    if(studentById(obj.student_id))return alert("Student ID-kan hore ayuu u jiraa.");
    const {error}=await supa.from("students").insert(obj);
    if(error)return alert("Kaydintu way fashilantay: "+error.message);
    await loadAll();e.target.reset();today("registration_date");alert("Ardayga waa la kaydiyey.");
  });

  $("studentSearchBtn").onclick=()=>renderStudents($("studentSearch").value);
  $("studentSearch").oninput=()=>renderStudents($("studentSearch").value);

  $("exam_student_id").addEventListener("input",()=>{
    if(!isRole("admin","exam_officer"))return;
    const s=studentById($("exam_student_id").value);
    setStudentInfo("exam",s);
    if(s){
      $("examStudentHint").textContent="Ardayga waa la helay. Maadooyinka waa la soo bandhigay.";
      $("examStudentHint").className="msg ok";
      buildExamSubjects();
    }else{
      $("examStudentHint").textContent="Student ID lama helin.";
      $("examStudentHint").className="msg error";
      $("examSubjects").classList.add("hidden");
    }
  });

  $("examForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!isRole("admin","exam_officer"))return alert("Admin ama Exam Officer oo keliya.");
    const s=studentById($("exam_student_id").value),eid=$("exam_id").value.trim();
    if(!s)return alert("Student ID sax ah geli.");
    if(!eid)return alert("Exam ID geli.");
    if(exams.some(x=>String(x.exam_id)===eid))return alert("Exam ID-kan hore ayuu u jiraa.");
    const trs=[...document.querySelectorAll("#examSubjectRows tr")];
    if(!trs.length)return alert("Maadooyin lama helin.");
    if(trs.some(tr=>tr.querySelector(".marks").value===""))return alert("Geli marks-ka dhammaan maadooyinka.");

    const examObj={
      exam_id:eid,exam_name:$("exam_name").value.trim(),student_id:s.student_id,student_name:s.full_name,
      level:s.level,grade:s.grade,subject:"All Subjects",academic_year:$("exam_year").value,
      semester:$("semester").value,exam_date:$("exam_date").value,total_marks:100,pass_mark:50
    };
    const resultObjs=trs.map(tr=>({
      student_id:s.student_id,student_name:s.full_name,exam_id:eid,subject:tr.dataset.subject,
      total_marks:Number(tr.querySelector(".total").value||100),marks:Number(tr.querySelector(".marks").value),
      grade:gradeOf(Number(tr.querySelector(".marks").value)),
      status:Number(tr.querySelector(".marks").value)>=Number(tr.querySelector(".pass").value)?"PASS":"FAIL",
      remarks:tr.querySelector(".remarks").value
    }));

    let r=await supa.from("exams").insert(examObj);
    if(r.error)return alert("Exam kaydintiisu fashilantay: "+r.error.message);
    r=await supa.from("results").insert(resultObjs);
    if(r.error){
      await supa.from("exams").delete().eq("exam_id",eid);
      return alert("Results kaydintoodu fashilantay: "+r.error.message);
    }
    await loadAll();e.target.reset();$("examSubjects").classList.add("hidden");today("exam_date");
    alert("Exam iyo dhammaan maadooyinkiisa waa la kaydiyey.");
  });

  $("resultSearchBtn").onclick=()=>renderResults($("resultSearch").value);
  $("resultSearch").oninput=()=>renderResults($("resultSearch").value);
  ["resultLevelFilter","resultGradeFilter","resultExamFilter"].forEach(id=>$(id)?.addEventListener("change",()=>renderResults($("resultSearch").value)));

  $("resultPrintBtn").onclick=()=>{
    if(!isRole("admin","exam_officer","student"))return;
    const area=$("resultsTableWrap").innerHTML;
    if(!area||area.includes("No results found"))return alert("Natiijo ma jirto.");
    const w=window.open("","_blank");
    if(!w)return alert("Ogolow pop-up kadib Print samee.");
    w.document.write(`<!doctype html><html><head><title>JAWIIL Exam Results</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:7px;white-space:nowrap}th{background:#124d80;color:white}</style></head><body><h1>JAWIIL Primary and Secondary School</h1><h2>Exam Results</h2>${area}</body></html>`);
    w.document.close();w.focus();setTimeout(()=>w.print(),300);
  };

  $("finance_student_id").addEventListener("input",()=>setStudentInfo("finance",studentById($("finance_student_id").value)));
  $("finance_total_fee").oninput=$("finance_amount_paid").oninput=()=>{
    $("finance_balance").value=(Number($("finance_total_fee").value||0)-Number($("finance_amount_paid").value||0)).toFixed(2);
  };

  $("financeForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!isRole("admin","treasurer"))return alert("Admin ama Treasurer oo keliya.");
    const sid=$("finance_student_id").value.trim(),s=studentById(sid);
    if(!s)return alert("Student ID lama helin.");
    const obj={
      transaction_id:$("finance_transaction_id").value.trim(),student_id:sid,student_name:s.full_name,
      fee_type:$("finance_fee_type").value.trim(),total_fee:Number($("finance_total_fee").value||0),
      amount_paid:Number($("finance_amount_paid").value||0),balance:Number($("finance_balance").value||0),
      payment_date:$("finance_payment_date").value,payment_method:$("finance_method").value,
      receipt_no:$("finance_receipt_no").value.trim(),remarks:$("finance_remarks").value
    };
    const {error}=await supa.from("finance").insert(obj);
    if(error)return alert("Finance kaydintiisu fashilantay: "+error.message);
    await loadAll();e.target.reset();today("finance_payment_date");alert("Payment-ka waa la kaydiyey.");
  });

  $("financeSearchBtn").onclick=()=>renderFinance($("financeSearch").value);
  $("financeSearch").oninput=()=>renderFinance($("financeSearch").value);

  $("globalSearchBtn").onclick=globalSearch;
  $("globalSearch").oninput=globalSearch;

  $("saveRoleBtn")?.addEventListener("click",saveProfile);

  document.querySelectorAll(".nav[data-page]").forEach(btn=>{
    btn.addEventListener("click",()=>showPage(btn.dataset.page));
  });
}

function globalSearch(){
  const box=$("globalSearchOutput");if(!box)return;
  const q=($("globalSearch").value||"").toLowerCase().trim();
  if(!q){box.innerHTML="";return;}
  if(isRole("exam_officer","admin")){
    const rows=students.filter(s=>(s.student_id+" "+s.full_name+" "+(s.phone||"")).toLowerCase().includes(q));
    box.innerHTML=rows.length?`<table><thead><tr><th>Student ID</th><th>Name</th><th>Level</th><th>Class</th></tr></thead><tbody>${rows.map(s=>`<tr><td>${esc(s.student_id)}</td><td>${esc(s.full_name)}</td><td>${esc(s.level)}</td><td>${esc(s.grade)}</td></tr>`).join("")}</tbody></table>`:"No student found.";
  }else if(isRole("treasurer","admin")){
    const rows=finance.filter(f=>(f.student_id+" "+(f.student_name||"")).toLowerCase().includes(q));
    box.innerHTML=rows.length?`<table><thead><tr><th>Student ID</th><th>Name</th><th>Paid</th><th>Date</th></tr></thead><tbody>${rows.map(f=>`<tr><td>${esc(f.student_id)}</td><td>${esc(f.student_name)}</td><td>${esc(f.amount_paid)}</td><td>${esc(f.payment_date)}</td></tr>`).join("")}</tbody></table>`:"No finance record found.";
  }else box.innerHTML="";
}

async function deleteStudent(id){
  if(!isRole("admin"))return alert("Admin oo keliya.");
  if(!confirm("Ma hubtaa inaad tirtirayso ardaygan iyo Exam/Results/Finance?"))return;
  for(const t of ["results","exams","finance","students"]){
    const {error}=await supa.from(t).delete().eq("student_id",id);
    if(error)return alert("Tirtiriddu fashilantay: "+error.message);
  }
  await loadAll();
}

async function deleteExam(examId){
  if(!isRole("admin","exam_officer"))return alert("Admin ama Exam Officer oo keliya.");
  if(!confirm("Ma hubtaa inaad tirtirayso Exam-kan iyo Results-kiisa?"))return;
  let r=await supa.from("results").delete().eq("exam_id",examId);
  if(r.error)return alert(r.error.message);
  r=await supa.from("exams").delete().eq("exam_id",examId);
  if(r.error)return alert(r.error.message);
  await loadAll();
}

async function deleteFinance(id){
  if(!isRole("admin","treasurer"))return alert("Admin ama Treasurer oo keliya.");
  if(!id)return alert("Record ID lama helin.");
  if(!confirm("Ma hubtaa inaad tirtirayso payment-kan?"))return;
  const {error}=await supa.from("finance").delete().eq("id",id);
  if(error)return alert(error.message);
  await loadAll();
}

async function loadProfiles(){
  if(!isRole("admin"))return;
  const {data,error}=await supa.from("profiles").select("user_id,email,full_name,role,student_id,created_at").order("created_at",{ascending:false});
  if(error)throw error;
  profiles=data||[];
  $("profileRows").innerHTML=profiles.map(p=>`<tr><td>${esc(p.user_id)}</td><td>${esc(p.email)}</td><td>${esc(p.full_name)}</td><td>${esc(p.role)}</td><td>${esc(p.student_id)}</td></tr>`).join("");
}

async function saveProfile(){
  if(!isRole("admin"))return;
  const user_id=$("role_user_id").value.trim();
  const email=$("role_email").value.trim();
  const full_name=$("role_full_name").value.trim();
  const selectedRole=$("role_select").value;
  const student_id=$("role_student_id").value.trim()||null;
  if(!user_id)return alert("Auth User ID geli.");
  if(selectedRole==="student"&&!student_id)return alert("Student role-ka Student ID waa qasab.");
  const {error}=await supa.from("profiles").upsert({
    user_id,email:email||null,full_name:full_name||null,role:selectedRole,
    student_id:selectedRole==="student"?student_id:null,updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  $("roleMsg").textContent=error?error.message:"Role-ka waa la kaydiyey.";
  $("roleMsg").className=error?"msg error":"msg ok";
  if(!error)await loadProfiles();
}

window.initDb=initDb;
window.loadAll=loadAll;
window.startStudentMode=startStudentMode;
window.applyRoleDashboard=applyRoleDashboard;
window.goToRoleStart=goToRoleStart;
window.deleteStudent=deleteStudent;
window.deleteExam=deleteExam;
window.deleteFinance=deleteFinance;

(async()=>{
  try{
    await initDb();
    currentProfile=window.currentProfile||null;
    bindEvents();
  }catch(e){
    console.error(e);
    const c=$("connection");
    if(c){c.textContent="Database error";c.className="connection error";}
  }
})();
