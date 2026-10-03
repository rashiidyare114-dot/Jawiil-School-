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
async function remove(table,id,arr,key){if(db){const {error}=await db.from(table).delete().eq("id",id);if(error){alert(error.message);return false}}else{arr.splice(id,1);localStorage.setItem(key,JSON.stringify(arr))}await loadAll();return true}

studentForm.onsubmit=async e=>{e.preventDefault();const d={student_id:student_id.value.trim(),admission_no:admission_no.value,full_name:full_name.value.trim(),gender:gender.value,dob:dob.value||null,phone:phone.value,guardian:guardian.value,guardian_phone:guardian_phone.value,level:level.value,grade:grade.value,academic_year:academic_year.value,registration_date:registration_date.value||null,address:address.value};if(await insert("students",d,local.students,"jawiil_students")){alert("Student registered successfully");studentForm.reset();await loadAll()}};
examForm.onsubmit=async e=>{e.preventDefault();const d={exam_id:exam_id.value.trim(),exam_name:exam_name.value,level:exam_level.value,grade:exam_grade.value,subject:subject.value,academic_year:exam_year.value,semester:semester.value,exam_date:exam_date.value||null,total_marks:+total_marks.value,pass_mark:+pass_mark.value};if(await insert("exams",d,local.exams,"jawiil_exams")){alert("Exam saved");examForm.reset();await loadAll()}};
result_student_id.oninput=()=>{const s=local.students.find(x=>(x.student_id||x.id+"").toLowerCase()===result_student_id.value.toLowerCase());result_student_name.value=s?s.full_name:""};
marks.oninput=()=>gradeResult();
function gradeResult(){const m=+marks.value,t=+result_total.value||100,p=m/t*100;result_grade.value=p>=90?"A+":p>=80?"A":p>=70?"B":p>=60?"C":p>=50?"D":"F";result_status.value=p>=50?"PASS":"FAIL"}
resultForm.onsubmit=async e=>{e.preventDefault();gradeResult();const d={student_id:result_student_id.value,student_name:result_student_name.value,exam_id:result_exam_id.value,subject:result_subject.value,total_marks:+result_total.value,marks:+marks.value,grade:result_grade.value,status:result_status.value,remarks:result_remarks.value};if(await insert("results",d,local.results,"jawiil_results")){alert("Result saved");resultForm.reset();await loadAll()}};
finance_student_id.oninput=()=>{const s=local.students.find(x=>x.student_id.toLowerCase()===finance_student_id.value.toLowerCase());finance_student_name.value=s?s.full_name:""};
function balance(){document.getElementById("balance").value=Math.max(0,(+total_fee.value||0)-(+amount_paid.value||0))}
total_fee.oninput=balance;amount_paid.oninput=balance;
financeForm.onsubmit=async e=>{e.preventDefault();balance();const d={transaction_id:transaction_id.value,student_id:finance_student_id.value,student_name:finance_student_name.value,fee_type:fee_type.value,total_fee:+total_fee.value,amount_paid:+amount_paid.value,balance:+balance.value,payment_date:payment_date.value||null,payment_method:payment_method.value,receipt_no:receipt_no.value,remarks:finance_remarks.value};if(await insert("finance",d,local.finance,"jawiil_finance")){alert("Payment saved");financeForm.reset();await loadAll()}};

function renderAll(){renderStudents(local.students);renderExams();renderResults(local.results);renderFinance();document.getElementById("statStudents").textContent=local.students.length;document.getElementById("statExams").textContent=local.exams.length;document.getElementById("statResults").textContent=local.results.length;document.getElementById("statPaid").textContent="$"+local.finance.reduce((a,x)=>a+(+x.amount_paid||0),0).toFixed(2)}
function renderStudents(list){studentRows.innerHTML=list.map((s,i)=>`<tr><td>${s.student_id}</td><td>${s.full_name}</td><td>${s.gender}</td><td>${s.level}</td><td>${s.grade}</td><td>${s.phone||""}</td><td><button class="view" onclick="viewStudent('${s.student_id}')">View</button><button class="delete" onclick="delStudent(${s.id??i})">Delete</button></td></tr>`).join("")}
function renderExams(){examRows.innerHTML=local.exams.map((x,i)=>`<tr><td>${x.exam_id}</td><td>${x.exam_name}</td><td>${x.level}</td><td>${x.grade}</td><td>${x.subject}</td><td>${x.academic_year||""}</td><td><button class="delete" onclick="delExam(${x.id??i})">Delete</button></td></tr>`).join("")}
function renderResults(list){resultRows.innerHTML=list.map((x,i)=>`<tr><td>${x.student_name||x.student_id}</td><td>${x.exam_id}</td><td>${x.subject}</td><td>${x.marks}/${x.total_marks}</td><td>${x.grade}</td><td>${x.status}</td><td><button class="delete" onclick="delResult(${x.id??i})">Delete</button></td></tr>`).join("")}
function renderFinance(){financeRows.innerHTML=local.finance.map((x,i)=>`<tr><td>${x.transaction_id}</td><td>${x.student_name||x.student_id}</td><td>${x.fee_type}</td><td>$${x.total_fee}</td><td>$${x.amount_paid}</td><td>$${x.balance}</td><td>${x.payment_date||""}</td><td><button class="delete" onclick="delFinance(${x.id??i})">Delete</button></td></tr>`).join("")}
async function delStudent(id){if(confirm("Delete student?"))await remove("students",id,local.students,"jawiil_students")}
async function delExam(id){if(confirm("Delete exam?"))await remove("exams",id,local.exams,"jawiil_exams")}
async function delResult(id){if(confirm("Delete result?"))await remove("results",id,local.results,"jawiil_results")}
async function delFinance(id){if(confirm("Delete payment?"))await remove("finance",id,local.finance,"jawiil_finance")}
function viewStudent(id){const s=local.students.find(x=>x.student_id===id);if(!s)return;alert(`Student ID: ${s.student_id}\nName: ${s.full_name}\nGender: ${s.gender}\nLevel: ${s.level}\nClass: ${s.grade}\nPhone: ${s.phone||""}\nGuardian: ${s.guardian||""}\nAcademic Year: ${s.academic_year||""}\nAddress: ${s.address||""}`)}
studentSearch.oninput=()=>{const q=studentSearch.value.toLowerCase();renderStudents(local.students.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)))}
resultSearch.oninput=()=>{const q=resultSearch.value.toLowerCase();renderResults(local.results.filter(s=>Object.values(s).join(" ").toLowerCase().includes(q)))}
loadAll();