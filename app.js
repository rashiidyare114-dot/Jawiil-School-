const grades={Primary:["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8"],Middle:["Form 1","Form 2","Form 3","Form 4"],Secondary:["Form 1","Form 2","Form 3","Form 4"]};
const subjects={Secondary:["Math","Physics","Biology","Chemistry","Arabic","Af-Soomaali","English","Technology","Business","Geography","History","Islamic Study"],Middle:["Xisaab","Saynis","Cilmi bulsho","Tarbiyo","Teknooloji","Carabi","English","Af-Soomaali"],Primary:["Tarbiyo","Cilmibulsho","Af-Soomaali","Saynis","English","Carabi","Xisaab"]};
const $=id=>document.getElementById(id);
function fillSelect(id,items,first="Select"){const s=$(id);if(!s)return;s.innerHTML=`<option value="">${first}</option>`;items.forEach(x=>s.insertAdjacentHTML("beforeend",`<option>${x}</option>`))}
function setupLevel(levelId,gradeId){$(levelId)?.addEventListener("change",e=>fillSelect(gradeId,grades[e.target.value]||[],"Select Class/Grade"))}
setupLevel("level","grade");
$("level")?.addEventListener("change",()=>{});

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(b.dataset.page).classList.add("active")});

const local={students:JSON.parse(localStorage.getItem("jawiil_students")||"[]"),exams:JSON.parse(localStorage.getItem("jawiil_exams")||"[]"),results:JSON.parse(localStorage.getItem("jawiil_results")||"[]"),finance:JSON.parse(localStorage.getItem("jawiil_finance")||"[]")};
async function loadAll(){
  if(!db){renderAll();return}
  const [s,e,r,f]=await Promise.all([
    db.from("students").select("*").order("created_at",{ascending:false}),
    db.from("exams").select("*").order("created_at",{ascending:false}),
    db.from("results").select("*").order("created_at",{ascending:false}),
    db.from("finance").select("*").order("created_at",{ascending:false})
  ]);
  if(!s.error)local.students=s.data||[];
  if(!e.error)local.exams=e.data||[];
  if(!r.error)local.results=r.data||[];
  if(!f.error)local.finance=f.data||[];
  renderAll();
};
function renderFinance(){financeRows.innerHTML=local.finance.map((x,i)=>`<tr><td>${escapeHtml(x.transaction_id)}</td><td>${escapeHtml(x.student_name||x.student_id)}</td><td>${escapeHtml(x.fee_type)}</td><td>$${x.total_fee}</td><td>$${x.amount_paid}</td><td>$${x.balance}</td><td>${escapeHtml(x.payment_date||"")}</td><td><button class="delete" onclick="delFinance(${x.id??i})">Delete</button></td></tr>`).join("")}
async function delStudent(id){if(confirm("Delete student?"))await remove("students",id,local.students,"jawiil_students")}async function delExam(id){if(confirm("Delete exam?"))await remove("exams",id,local.exams,"jawiil_exams")}async function delFinance(id){if(confirm("Delete payment?"))await remove("finance",id,local.finance,"jawiil_finance")}
function viewStudent(id){const s=local.students.find(x=>x.student_id===id);if(!s)return;alert(`Student ID: ${s.student_id}\nName: ${s.full_name}\nGender: ${s.gender}\nLevel: ${s.level}\nClass: ${s.grade}\nPhone: ${s.phone||""}\nGuardian: ${s.guardian||""}\nAcademic Year: ${s.academic_year||""}\nAddress: ${s.address||""}`)}
studentSearch.oninput=()=>{const q=studentSearch.value.toLowerCase();renderStudents(local.students.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)))};examSearch.oninput=()=>{const q=examSearch.value.toLowerCase();renderExamsFiltered(q)};

// Results are output-only. These controls only filter saved results.
function filterResults(){
  const qs=($("resultStudentSearch")?.value||"").trim().toLowerCase();
  const qe=($("resultExamSearch")?.value||"").trim().toLowerCase();
  let list=local.results.filter(x=>{
    const student=[x.student_id,x.student_name].join(" ").toLowerCase();
    const exam=[x.exam_id,x.exam_name].join(" ").toLowerCase();
    return (!qs||student.includes(qs))&&(!qe||exam.includes(qe));
  });
  renderResults(list);
}
$("resultSearchBtn")?.addEventListener("click",filterResults);
$("resultClearBtn")?.addEventListener("click",()=>{
  $("resultStudentSearch").value="";
  $("resultExamSearch").value="";
  renderResults(local.results);
});
$("resultStudentSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter")filterResults()});
$("resultExamSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter")filterResults()});

function renderExamsFiltered(q){renderExams();if(!q)return;examRows.innerHTML=local.exams.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)).map((x,i)=>`<tr><td>${escapeHtml(x.exam_id)}</td><td>${escapeHtml(x.student_id||"")}</td><td>${escapeHtml(x.student_name||"")}</td><td>${escapeHtml(x.level)}</td><td>${escapeHtml(x.grade)}</td><td>${escapeHtml(x.subject)}</td><td>${escapeHtml(x.academic_year||"")}</td><td>${x.marks??"-"}/${x.total_marks??"-"}</td><td>${escapeHtml(local.results.find(r=>String(r.exam_id)===String(x.exam_id)&&String(r.student_id)===String(x.student_id)&&String(r.subject)===String(x.subject))?.grade||"")}</td><td>${escapeHtml(local.results.find(r=>String(r.exam_id)===String(x.exam_id)&&String(r.student_id)===String(x.student_id)&&String(r.subject)===String(x.subject))?.status||"")}</td><td><button class="delete" onclick="delExam(${x.id??i})">Delete</button></td></tr>`).join("")}
loadAll();
