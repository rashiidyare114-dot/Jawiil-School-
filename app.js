const grades={
 Primary:["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8"],
 Middle:["Form 1","Form 2","Form 3","Form 4"],
 Secondary:["Form 1","Form 2","Form 3","Form 4"]
};
const subjects={
 Secondary:["Math","Physics","Biology","Chemistry","Arabic","Af-Soomaali","English","Technology","Business","Geography","History","Islamic Study"],
 Middle:["Xisaab","Saynis","Cilmi bulsho","Tarbiyo","Teknooloji","Carabi","English","Af-Soomaali"],
 Primary:["Tarbiyo","Cilmibulsho","Af-Soomaali","Saynis","English","Carabi","Xisaab"]
};

function fillSelect(id,items,first="Select"){const s=document.getElementById(id);s.innerHTML=`<option value="">${first}</option>`;items.forEach(x=>s.insertAdjacentHTML("beforeend",`<option>${x}</option>`))}
function setupLevel(levelId,gradeId,subjectId){document.getElementById(levelId).addEventListener("change",e=>{const l=e.target.value;fillSelect(gradeId,grades[l]||[],"Select Class/Grade");if(subjectId)fillSelect(subjectId,subjects[l]||[],"Select Subject")})}
setupLevel("level","grade",null);setupLevel("exam_level","exam_grade","subject");

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));document.getElementById(b.dataset.page).classList.add("active")});

const local={students:JSON.parse(localStorage.getItem("jawiil_students")||"[]"),exams:JSON.parse(localStorage.getItem("jawiil_exams")||"[]"),results:JSON.parse(localStorage.getItem("jawiil_results")||"[]"),finance:JSON.parse(localStorage.getItem("jawiil_finance")||"[]")};

async function loadAll(){
 if(!db){renderAll();return}
 const [s,e,r,f]=await Promise.all([db.from("students").select("*").order("created_at",{ascending:false}),db.from("exams").select("*").order("created_at",{ascending:false}),db.from("results").select("*").order("created_at",{ascending:false}),db.from("finance").select("*").order("created_at",{ascending:false})]);
 if(!s.error)local.students=s.data;if(!e.error)local.exams=e.data;if(!r.error)local.results=r.data;if(!f.error)local.finance=f.data;renderAll();
}
async function insert(table,data,arr,key){if(db){const {error}=await db.from(table).insert(data);if(error){alert(error.message);return false}}else{arr.push(data);localStorage.setItem(key,JSON.stringify(arr))}return true}
async function insertMany(table,data,arr,key){if(!data.length)return true;if(db){const {error}=await db.from(table).insert(data);if(error){alert(error.message);return false}}else{arr.push(...data);localStorage.setItem(key,JSON.stringify(arr))}return true}
async function remove(table,id,arr,key){if(db){const {error}=await db.from(table).delete().eq("id",id);if(error){alert(error.message);return false}}else{arr.splice(id,1);localStorage.setItem(key,JSON.stringify(arr))}await loadAll();return true}

function findStudent(id){const q=(id||"").trim().toLowerCase();return local.students.find(x=>String(x.student_id||"").toLowerCase()===q)||null}
function setStudentFields(prefix,s){
 const map={student_name:s?.full_name||"",student_level:s?.level||"",student_grade:s?.grade||""};
 Object.entries(map).forEach(([k,v])=>{const el=document.getElementById(prefix+k);if(el)el.value=v});
}

studentForm.onsubmit=async e=>{e.preventDefault();const d={student_id:student_id.value.trim(),admission_no:admission_no.value,full_name:full_name.value.trim(),gender:gender.value,dob:dob.value||null,phone:phone.value,guardian:guardian.value,guardian_phone:guardian_phone.value,level:level.value,grade:grade.value,academic_year:academic_year.value,registration_date:registration_date.value||null,address:address.value};if(await insert("students",d,local.students,"jawiil_students")){alert("Student registered successfully");studentForm.reset();await loadAll()}};

function fillStudentFromExam(){const s=findStudent(exam_student_id.value);setStudentFields("exam_",s);if(s){exam_level.value=s.level;fillSelect("exam_grade",grades[s.level]||[],"Select Class/Grade");exam_grade.value=s.grade;fillSelect("subject",subjects[s.level]||[],"Select Subject");}else{exam_student_name.value="";exam_student_level.value="";exam_student_grade.value=""}}
exam_student_id.oninput=fillStudentFromExam;
examForm.onsubmit=async e=>{e.preventDefault();const s=findStudent(exam_student_id.value);if(!s){alert("Student ID lama helin. Marka hore register garee ardayga.");return}const d={exam_id:exam_id.value.trim(),exam_name:exam_name.value,student_id:s.student_id,student_name:s.full_name,level:exam_level.value||s.level,grade:exam_grade.value||s.grade,subject:subject.value,academic_year:exam_year.value,semester:semester.value,exam_date:exam_date.value||null,total_marks:+total_marks.value,pass_mark:+pass_mark.value};if(await insert("exams",d,local.exams,"jawiil_exams")){alert("Exam entry saved");examForm.reset();await loadAll()}};

function fillStudentFromResult(){const s=findStudent(result_student_id.value);setStudentFields("result_",s);if(s)loadResultSubjects();else{result_exam_name.value="";resultSubjects.style.display="none";resultMessage.textContent="Student ID lama helin."}}
result_student_id.oninput=()=>{clearTimeout(window._studentTimer);window._studentTimer=setTimeout(fillStudentFromResult,100)};
result_exam_id.oninput=()=>{clearTimeout(window._examTimer);window._examTimer=setTimeout(loadResultSubjects,100)};

function gradeFor(m,t){const p=(+m||0)/(+t||100)*100;return p>=90?"A+":p>=80?"A":p>=70?"B":p>=60?"C":p>=50?"D":"F"}
function statusFor(m,t,pass){return (+m||0)>=(+pass||50)?"PASS":"FAIL"}
function updateResultRow(row){const m=row.querySelector(".subject-marks").value;const t=row.querySelector(".subject-total").value;const pass=row.dataset.pass||50;row.querySelector(".subject-grade").value=m===""?"":gradeFor(m,t);row.querySelector(".subject-status").value=m===""?"":statusFor(m,t,pass)}

function loadResultSubjects(){
 const sid=result_student_id.value.trim(), eid=result_exam_id.value.trim();const s=findStudent(sid);if(!s||!eid){resultSubjects.style.display="none";resultMessage.textContent="Geli Student ID iyo Exam ID si maadooyinka loo soo saaro.";return}
 const examRows=local.exams.filter(x=>String(x.exam_id||"").toLowerCase()===eid.toLowerCase() && String(x.student_id||sid).toLowerCase()===sid.toLowerCase());
 const classRows=local.exams.filter(x=>String(x.exam_id||"").toLowerCase()===eid.toLowerCase() && String(x.level||"")===String(s.level||"") && String(x.grade||"")===String(s.grade||""));
 const rows=examRows.length?examRows:classRows;
 const unique=[];const seen=new Set();rows.forEach(x=>{if(x.subject&&!seen.has(x.subject)){seen.add(x.subject);unique.push(x)}});
 if(!unique.length){resultSubjects.style.display="none";resultMessage.textContent="Exam ID-kan ma laha Exam Entry subjects. Marka hore Exam Entry ku diiwaangeli maadooyinka.";return}
 result_exam_name.value=unique[0].exam_name||"";resultSubjectRows.innerHTML=unique.map((x,i)=>{
   const old=local.results.find(r=>String(r.student_id||"").toLowerCase()===sid.toLowerCase()&&String(r.exam_id||"").toLowerCase()===eid.toLowerCase()&&String(r.subject||"").toLowerCase()===String(x.subject).toLowerCase());
   const total=old?.total_marks??x.total_marks??100;const pass=x.pass_mark??50;
   return `<tr data-pass="${pass}" data-subject="${escapeHtml(x.subject)}"><td>${escapeHtml(x.subject)}</td><td><input class="subject-total" type="number" min="1" value="${total}"></td><td><input class="subject-marks" type="number" min="0" max="${total}" value="${old?.marks??""}"></td><td><input class="subject-grade" readonly value="${old?.grade??""}"></td><td><input class="subject-status" readonly value="${old?.status??""}"></td><td><input class="subject-remarks" value="${escapeHtml(old?.remarks||"")}"></td></tr>`
 }).join("");
 resultSubjectRows.querySelectorAll(".subject-marks,.subject-total").forEach(el=>el.oninput=()=>updateResultRow(el.closest("tr")));
 resultSubjects.style.display="block";resultMessage.textContent=`${unique.length} maado ayaa diyaar ah. Geli marks-ka dhammaantood, kadib Save All Subject Results.`;
}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

saveAllResults.onclick=async()=>{
 const sid=result_student_id.value.trim(),eid=result_exam_id.value.trim(),s=findStudent(sid);if(!s||!eid){alert("Student ID iyo Exam ID waa required.");return}
 const rows=[...resultSubjectRows.querySelectorAll("tr")];const missing=rows.find(r=>r.querySelector(".subject-marks").value==="");if(missing){alert("Fadlan marks geli dhammaan maadooyinka.");return}
 const data=rows.map(r=>({student_id:s.student_id,student_name:s.full_name,exam_id:eid,subject:r.dataset.subject,total_marks:+r.querySelector(".subject-total").value,marks:+r.querySelector(".subject-marks").value,grade:r.querySelector(".subject-grade").value,status:r.querySelector(".subject-status").value,remarks:r.querySelector(".subject-remarks").value}));
 const existing=local.results.filter(x=>String(x.student_id||"").toLowerCase()===sid.toLowerCase()&&String(x.exam_id||"").toLowerCase()===eid.toLowerCase());
 let ok=true;
 for(const d of data){const old=existing.find(x=>String(x.subject||"").toLowerCase()===d.subject.toLowerCase());if(old&&db){const {error}=await db.from("results").update(d).eq("id",old.id);if(error){alert(error.message);ok=false;break}}else if(old&&!db){Object.assign(old,d)}else{if(!(await insert("results",d,local.results,"jawiil_results"))){ok=false;break}}}
 if(!db)localStorage.setItem("jawiil_results",JSON.stringify(local.results));
 if(ok){alert("Dhammaan natiijooyinka maadooyinka waa la keydiyey.");await loadAll();loadResultSubjects()}
};

finance_student_id.oninput=()=>{const s=findStudent(finance_student_id.value);setStudentFields("finance_",s)};
function balance(){document.getElementById("balance").value=Math.max(0,(+total_fee.value||0)-(+amount_paid.value||0))}
total_fee.oninput=balance;amount_paid.oninput=balance;
financeForm.onsubmit=async e=>{e.preventDefault();const s=findStudent(finance_student_id.value);if(!s){alert("Student ID lama helin. Marka hore register garee ardayga.");return}balance();const d={transaction_id:transaction_id.value,student_id:s.student_id,student_name:s.full_name,fee_type:fee_type.value,total_fee:+total_fee.value,amount_paid:+amount_paid.value,balance:+balance.value,payment_date:payment_date.value||null,payment_method:payment_method.value,receipt_no:receipt_no.value,remarks:finance_remarks.value};if(await insert("finance",d,local.finance,"jawiil_finance")){alert("Payment saved");financeForm.reset();await loadAll()}};

function renderAll(){renderStudents(local.students);renderExams();renderResults(local.results);renderFinance();document.getElementById("statStudents").textContent=local.students.length;document.getElementById("statExams").textContent=local.exams.length;document.getElementById("statResults").textContent=local.results.length;document.getElementById("statPaid").textContent="$"+local.finance.reduce((a,x)=>a+(+x.amount_paid||0),0).toFixed(2)}
function renderStudents(list){studentRows.innerHTML=list.map((s,i)=>`<tr><td>${escapeHtml(s.student_id)}</td><td>${escapeHtml(s.full_name)}</td><td>${escapeHtml(s.gender)}</td><td>${escapeHtml(s.level)}</td><td>${escapeHtml(s.grade)}</td><td>${escapeHtml(s.phone||"")}</td><td><button class="view" onclick="viewStudent('${escapeHtml(s.student_id)}')">View</button><button class="delete" onclick="delStudent(${s.id??i})">Delete</button></td></tr>`).join("")}
function renderExams(){examRows.innerHTML=local.exams.map((x,i)=>`<tr><td>${escapeHtml(x.exam_id)}</td><td>${escapeHtml(x.student_id||"")}</td><td>${escapeHtml(x.student_name||"")}</td><td>${escapeHtml(x.level)}</td><td>${escapeHtml(x.grade)}</td><td>${escapeHtml(x.subject)}</td><td>${escapeHtml(x.academic_year||"")}</td><td><button class="delete" onclick="delExam(${x.id??i})">Delete</button></td></tr>`).join("")}
function renderResults(list){resultRows.innerHTML=list.map((x,i)=>`<tr><td>${escapeHtml(x.student_name||x.student_id)}</td><td>${escapeHtml(x.exam_id)}</td><td>${escapeHtml(x.subject)}</td><td>${x.marks}/${x.total_marks}</td><td>${escapeHtml(x.grade)}</td><td>${escapeHtml(x.status)}</td><td><button class="delete" onclick="delResult(${x.id??i})">Delete</button></td></tr>`).join("")}
function renderFinance(){financeRows.innerHTML=local.finance.map((x,i)=>`<tr><td>${escapeHtml(x.transaction_id)}</td><td>${escapeHtml(x.student_name||x.student_id)}</td><td>${escapeHtml(x.fee_type)}</td><td>$${x.total_fee}</td><td>$${x.amount_paid}</td><td>$${x.balance}</td><td>${escapeHtml(x.payment_date||"")}</td><td><button class="delete" onclick="delFinance(${x.id??i})">Delete</button></td></tr>`).join("")}
async function delStudent(id){if(confirm("Delete student?"))await remove("students",id,local.students,"jawiil_students")}
async function delExam(id){if(confirm("Delete exam?"))await remove("exams",id,local.exams,"jawiil_exams")}
async function delResult(id){if(confirm("Delete result?"))await remove("results",id,local.results,"jawiil_results")}
async function delFinance(id){if(confirm("Delete payment?"))await remove("finance",id,local.finance,"jawiil_finance")}
function viewStudent(id){const s=local.students.find(x=>x.student_id===id);if(!s)return;alert(`Student ID: ${s.student_id}\nName: ${s.full_name}\nGender: ${s.gender}\nLevel: ${s.level}\nClass: ${s.grade}\nPhone: ${s.phone||""}\nGuardian: ${s.guardian||""}\nAcademic Year: ${s.academic_year||""}\nAddress: ${s.address||""}`)}
studentSearch.oninput=()=>{const q=studentSearch.value.toLowerCase();renderStudents(local.students.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)))}
resultSearch.oninput=()=>{const q=resultSearch.value.toLowerCase();renderResults(local.results.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)))}
loadAll();
