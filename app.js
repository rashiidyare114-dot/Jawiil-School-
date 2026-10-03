const grades={Primary:["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8"],Middle:["Form 1","Form 2","Form 3","Form 4"],Secondary:["Form 1","Form 2","Form 3","Form 4"]};
const subjects={Secondary:["Math","Physics","Biology","Chemistry","Arabic","Af-Soomaali","English","Technology","Business","Geography","History","Islamic Study"],Middle:["Xisaab","Saynis","Cilmi bulsho","Tarbiyo","Teknooloji","Carabi","English","Af-Soomaali"],Primary:["Tarbiyo","Cilmibulsho","Af-Soomaali","Saynis","English","Carabi","Xisaab"]};
const $=id=>document.getElementById(id);
function fillSelect(id,items,first="Select"){const s=$(id);if(!s)return;s.innerHTML=`<option value="">${first}</option>`;items.forEach(x=>s.insertAdjacentHTML("beforeend",`<option>${x}</option>`))}
function setupLevel(levelId,gradeId){$(levelId)?.addEventListener("change",e=>fillSelect(gradeId,grades[e.target.value]||[],"Select Class/Grade"))}
setupLevel("level","grade");
$("level")?.addEventListener("change",()=>{});

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(b.dataset.page).classList.add("active")});

const local={students:JSON.parse(localStorage.getItem("jawiil_students")||"[]"),exams:JSON.parse(localStorage.getItem("jawiil_exams")||"[]"),results:JSON.parse(localStorage.getItem("jawiil_results")||"[]"),finance:JSON.parse(localStorage.getItem("jawiil_finance")||"[]")};
async function loadAll(){if(!db){renderAll();return}const [s,e,r,f]=await Promise.all([db.from("students").select("*").order("created_at",{ascending:false}),db.from("exams").select("*").order("created_at",{ascending:false}),db.from("results").select("*").order("created_at",{ascending:false}),db.from("finance").select("*").order("created_at",{ascending:false})]);if(!s.error)local.students=s.data;if(!e.error)local.exams=e.data;if(!r.error)local.results=r.data;if(!f.error)local.finance=f.data;renderAll()}
async function insert(table,data,arr,key){if(db){const {error}=await db.from(table).insert(data);if(error){alert(error.message);return false}}else{arr.push(data);localStorage.setItem(key,JSON.stringify(arr))}return true}
async function insertMany(table,data,arr,key){if(!data.length)return true;if(db){const {error}=await db.from(table).insert(data);if(error){alert(error.message);return false}}else{arr.push(...data);localStorage.setItem(key,JSON.stringify(arr))}return true}
async function remove(table,id,arr,key){if(db){const {error}=await db.from(table).delete().eq("id",id);if(error){alert(error.message);return false}}else{arr.splice(id,1);localStorage.setItem(key,JSON.stringify(arr))}await loadAll();return true}
function findStudent(id){const q=(id||"").trim().toLowerCase();return local.students.find(x=>String(x.student_id||"").toLowerCase()===q)||null}
function setStudentFields(prefix,s){const map={student_name:s?.full_name||"",student_level:s?.level||"",student_grade:s?.grade||""};Object.entries(map).forEach(([k,v])=>{const el=$(prefix+k);if(el)el.value=v})}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function gradeFor(m,t){const p=(+m||0)/(+t||100)*100;return p>=90?"A+":p>=80?"A":p>=70?"B":p>=60?"C":p>=50?"D":"F"}
function statusFor(m,pass){return (+m||0)>=(+pass||50)?"PASS":"FAIL"}

studentForm.onsubmit=async e=>{e.preventDefault();const d={student_id:student_id.value.trim(),admission_no:admission_no.value,full_name:full_name.value.trim(),gender:gender.value,dob:dob.value||null,phone:phone.value,guardian:guardian.value,guardian_phone:guardian_phone.value,level:level.value,grade:grade.value,academic_year:academic_year.value,registration_date:registration_date.value||null,address:address.value};if(await insert("students",d,local.students,"jawiil_students")){alert("Student registered successfully");studentForm.reset();await loadAll()}};

function fillStudentFromExam(){const s=findStudent(exam_student_id.value);setStudentFields("exam_",s);if(s){loadExamSubjects(s.level)}else{$("examSubjects").style.display="none";$('examMessage').textContent="Student ID lama helin."}}
exam_student_id.oninput=fillStudentFromExam;
function loadExamSubjects(level){const list=subjects[level]||[];if(!list.length){$("examSubjects").style.display="none";return}if($("examSubjectTitle"))$("examSubjectTitle").textContent=`${level} Subjects (${list.length})`;if($("subjectList"))$("subjectList").innerHTML=list.map((sub,i)=>`<span class="subject-chip">${i+1}. ${escapeHtml(sub)}</span>`).join("");$("examSubjectRows").innerHTML=list.map(sub=>`<tr data-subject="${escapeHtml(sub)}"><td><b>${escapeHtml(sub)}</b></td><td><input class="exam-total" type="number" min="1" value="100"></td><td><input class="exam-pass" type="number" min="0" value="50"></td><td><input class="exam-marks" type="number" min="0" max="100"></td><td><input class="exam-grade" readonly></td><td><input class="exam-status" readonly></td><td><input class="exam-remarks"></td></tr>`).join("");
 document.querySelectorAll("#examSubjectRows .exam-marks,#examSubjectRows .exam-total,#examSubjectRows .exam-pass").forEach(el=>el.oninput=()=>{const r=el.closest("tr"),m=r.querySelector(".exam-marks").value,t=r.querySelector(".exam-total").value,p=r.querySelector(".exam-pass").value;r.querySelector(".exam-grade").value=m===""?"":gradeFor(m,t);r.querySelector(".exam-status").value=m===""?"":statusFor(m,p)});
 $("examSubjects").style.display="block";$('examMessage').textContent=`${list.length} maado ayaa diyaar ah. Geli marks-ka dhammaan maadooyinka, kadib Save Complete Exam.`}

saveExamBundle.onclick=async()=>{const s=findStudent(exam_student_id.value),eid=exam_id.value.trim();if(!s||!eid||!exam_name.value.trim()){alert("Student ID, Exam ID iyo Exam Name waa required.");return}const rows=[...document.querySelectorAll("#examSubjectRows tr")];if(!rows.length){alert("Maadooyin lama helin.");return}if(rows.some(r=>r.querySelector(".exam-marks").value==="")){alert("Fadlan marks geli dhammaan maadooyinka.");return}
 const examsData=[{
  exam_id:eid,
  exam_name:exam_name.value.trim(),
  student_id:s.student_id,
  student_name:s.full_name,
  level:s.level,
  grade:s.grade,
  subject:"All Subjects",
  academic_year:exam_year.value,
  semester:semester.value,
  exam_date:exam_date.value||null,
  total_marks:100,
  pass_mark:50
}];
 const resultsData=rows.map(r=>({student_id:s.student_id,student_name:s.full_name,exam_id:eid,subject:r.dataset.subject,total_marks:+r.querySelector(".exam-total").value,marks:+r.querySelector(".exam-marks").value,grade:r.querySelector(".exam-grade").value,status:r.querySelector(".exam-status").value,remarks:r.querySelector(".exam-remarks").value}));
 if(db){await db.from("exams").delete().eq("exam_id",eid).eq("student_id",s.student_id);await db.from("results").delete().eq("exam_id",eid).eq("student_id",s.student_id)}else{local.exams=local.exams.filter(x=>!(String(x.exam_id).toLowerCase()===eid.toLowerCase()&&String(x.student_id).toLowerCase()===String(s.student_id).toLowerCase()));local.results=local.results.filter(x=>!(String(x.exam_id).toLowerCase()===eid.toLowerCase()&&String(x.student_id).toLowerCase()===String(s.student_id).toLowerCase()))}
 const ok1=await insertMany("exams",examsData,local.exams,"jawiil_exams");
const ok2=ok1&&await insertMany("results",resultsData,local.results,"jawiil_results");
if(ok2){
  alert("Exam iyo dhammaan maadooyinkiisa waa la keydiyey.");
  examForm.reset();
  $("examSubjects").style.display="none";
  await loadAll();
}};

function renderFinance(){financeRows.innerHTML=local.finance.map((x,i)=>`<tr><td>${escapeHtml(x.transaction_id)}</td><td>${escapeHtml(x.student_name||x.student_id)}</td><td>${escapeHtml(x.fee_type)}</td><td>$${x.total_fee}</td><td>$${x.amount_paid}</td><td>$${x.balance}</td><td>${escapeHtml(x.payment_date||"")}</td><td><button class="delete" onclick="delFinance(${x.id??i})">Delete</button></td></tr>`).join("")}
async function delStudent(id){if(confirm("Delete student?"))await remove("students",id,local.students,"jawiil_students")}async function delExam(id){if(confirm("Delete exam?"))await remove("exams",id,local.exams,"jawiil_exams")}async function delFinance(id){if(confirm("Delete payment?"))await remove("finance",id,local.finance,"jawiil_finance")}
function viewStudent(id){const s=local.students.find(x=>x.student_id===id);if(!s)return;alert(`Student ID: ${s.student_id}\nName: ${s.full_name}\nGender: ${s.gender}\nLevel: ${s.level}\nClass: ${s.grade}\nPhone: ${s.phone||""}\nGuardian: ${s.guardian||""}\nAcademic Year: ${s.academic_year||""}\nAddress: ${s.address||""}`)}
studentSearch.oninput=()=>{const q=studentSearch.value.toLowerCase();renderStudents(local.students.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)))};examSearch.oninput=()=>{const q=examSearch.value.toLowerCase();renderExamsFiltered(q)};resultSearch.oninput=()=>{const q=resultSearch.value.toLowerCase();renderResults(local.results.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)))};
function renderExamsFiltered(q){renderExams();if(!q)return;examRows.innerHTML=local.exams.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)).map((x,i)=>`<tr><td>${escapeHtml(x.exam_id)}</td><td>${escapeHtml(x.student_id||"")}</td><td>${escapeHtml(x.student_name||"")}</td><td>${escapeHtml(x.level)}</td><td>${escapeHtml(x.grade)}</td><td>${escapeHtml(x.subject)}</td><td>${escapeHtml(x.academic_year||"")}</td><td>${x.marks??"-"}/${x.total_marks??"-"}</td><td>${escapeHtml(local.results.find(r=>String(r.exam_id)===String(x.exam_id)&&String(r.student_id)===String(x.student_id)&&String(r.subject)===String(x.subject))?.grade||"")}</td><td>${escapeHtml(local.results.find(r=>String(r.exam_id)===String(x.exam_id)&&String(r.student_id)===String(x.student_id)&&String(r.subject)===String(x.subject))?.status||"")}</td><td><button class="delete" onclick="delExam(${x.id??i})">Delete</button></td></tr>`).join("")}
loadAll();
