/* DATA */

const categories = [
    "Food & Drinks",
    "Transportation",
    "House",
    "Study",
    "Shopping",
    "Others"
];


let expenses = [];

let limits = {
    "Food & Drinks":4000000,
    "Transportation":500000,
    "House":6000000,
    "Study":20000000,
    "Shopping":0,
    "Others":0
};


/* ICON MAP */

function getIcon(cat){

    const k = cat.toLowerCase();

    if(k.includes("food")) return "assets/icons/food.png";
    if(k.includes("transport")) return "assets/icons/transport.png";
    if(k.includes("house")) return "assets/icons/house.png";
    if(k.includes("study")) return "assets/icons/study.png";
    if(k.includes("shop")) return "assets/icons/shopping.png";

    return "assets/icons/default.png";
}


/* PAGE */

function showPage(page){

    document.querySelectorAll(".page").forEach(p=>{
        p.classList.add("hidden");
    });

    document.querySelectorAll(".nav-btn").forEach(b=>{
        b.classList.remove("active");
    });


    if(page==="add"){
        addPage.classList.remove("hidden");
        navAdd.classList.add("active");
        pageTitle.innerText="Add Expense";
    }

    if(page==="budget"){
        budgetPage.classList.remove("hidden");
        navBudget.classList.add("active");
        pageTitle.innerText="Budget";
        loadBudget();
    }

    if(page==="summary"){
        summaryPage.classList.remove("hidden");
        navSummary.classList.add("active");
        pageTitle.innerText="Overview";
        loadSummary();
        loadHistory();
    }

}


/* MONEY */

function format(n){
    return n.toLocaleString("vi-VN");
}


/* ADD */

function addExpense(){

    const des = description.value.trim();
    const amt = Number(amount.value);

    if(!des || !amt) return alert("Fill all fields");


    let cat="Others";

    if(des.toLowerCase().includes("food")) cat="Food & Drinks";
    if(des.toLowerCase().includes("taxi")) cat="Transportation";
    if(des.toLowerCase().includes("rent")) cat="House";
    if(des.toLowerCase().includes("study")) cat="Study";
    if(des.toLowerCase().includes("shop")) cat="Shopping";


    expenses.push({
        desc:des,
        amount:amt,
        cat,
        date:new Date().toLocaleDateString()
    });


    description.value="";
    amount.value="";

    showPage("summary");
}


/* TOTAL */

function getSpent(cat){

    return expenses
        .filter(e=>e.cat===cat)
        .reduce((s,e)=>s+e.amount,0);
}


/* BUDGET */

function loadBudget(){

    const box = document.getElementById("limitContainer");

    box.innerHTML="";


    categories.forEach(cat=>{

        const spent = getSpent(cat);
        const limit = limits[cat]||0;

        let status="";

        if(!limit){
            status=`<span class="no-limit">No limit set yet</span>`;
        }
        else if(spent>limit){
            status=`<span class="over">
                Over budget: ${format(spent-limit)}
            </span>`;
        }
        else{
            status=`<span class="remain">
                Remaining: ${format(limit-spent)}
            </span>`;
        }


        box.innerHTML +=`

        <div class="card budget-card">

            <div class="budget-left">

                <div class="icon-circle small">
                    <img src="${getIcon(cat)}" class="icon-img">
                </div>

                <div>
                    <div class="budget-title">${cat}</div>
                    <div class="budget-status">${status}</div>
                </div>

            </div>


            <div class="budget-right">

                <input type="number"
                    id="limit-${cat}"
                    value="${limit||""}"
                    placeholder="Limit">

                <button onclick="saveLimit('${cat}')">
                    Save
                </button>

            </div>

        </div>

        `;

    });

}


/* SAVE */

function saveLimit(cat){

    const v =
        Number(document.getElementById("limit-"+cat).value);

    limits[cat]=v;

    loadBudget();
}


/* SUMMARY */

function loadSummary(){

    const box = document.getElementById("summaryContainer");

    box.innerHTML="";


    categories.forEach(cat=>{

        const spent = getSpent(cat);
        const limit = limits[cat]||0;

        if(spent===0) return;


        let percent=0;
        let text="No limit";

        if(limit){
            percent=Math.min(spent/limit*100,100);

            text = spent>limit
                ? "Over budget"
                : "Remaining";
        }


        box.innerHTML+=`

        <div class="summary-card">

            <div class="summary-top">

                <div class="icon-circle">
                    <img src="${getIcon(cat)}" class="icon-img">
                </div>

                <div>

                    <div class="summary-title">${cat}</div>

                    <div class="summary-money">
                        ${format(spent)} / ${format(limit)}
                    </div>

                    <div class="summary-status">
                        ${text}
                    </div>

                </div>

            </div>

            ${
                limit
                ?
                `<div class="progress">
                    <div style="width:${percent}%"></div>
                </div>`
                :""
            }

        </div>

        `;

    });

}


/* HISTORY */

function loadHistory(){

    const box = document.getElementById("historyContainer");

    box.innerHTML="";


    expenses.slice().reverse().forEach(e=>{

        box.innerHTML+=`

        <div class="history-item">

            <div>
                <b>${e.desc}</b>
                <div style="font-size:12px;color:#999">
                    ${e.date}
                </div>
            </div>

            <div style="color:#5A6CFF">
                ${format(e.amount)}
            </div>

        </div>

        `;

    });

}


/* START */

showPage("add");
