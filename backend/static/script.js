// ===== NAVIGATION =====
function showPage(page) {
    document.getElementById("addPage").classList.add("hidden");
    document.getElementById("budgetPage").classList.add("hidden");
    document.getElementById("summaryPage").classList.add("hidden");

    if (page === "add") {
        document.getElementById("pageTitle").innerText = "Add Expense";
        document.getElementById("addPage").classList.remove("hidden");
    }

    if (page === "budget") {
        document.getElementById("pageTitle").innerText = "Set Budget";
        document.getElementById("budgetPage").classList.remove("hidden");
        loadLimits();
    }

    if (page === "summary") {
        document.getElementById("pageTitle").innerText = "Summary";
        document.getElementById("summaryPage").classList.remove("hidden");
        loadSummary();
        loadHistory();
    }
}


// ===== ADD EXPENSE =====
async function addExpense() {
    const description = document.getElementById("description").value;
    const amount = document.getElementById("amount").value;

    if (!description || !amount) {
        alert("Please fill all fields");
        return;
    }

    const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            description: description,
            amount: amount
        })
    });

    if (response.ok) {
        alert("Expense added!");
        document.getElementById("description").value = "";
        document.getElementById("amount").value = "";
    } else {
        alert("Error adding expense");
    }
}


// ===== LOAD LIMITS =====
async function loadLimits() {
    const res = await fetch("/api/limits");
    const data = await res.json();

    const container = document.getElementById("limitContainer");
    container.innerHTML = "";

    const categories = Object.keys(data);

    if (categories.length === 0) {
        container.innerHTML = "No categories yet. Add expense first.";
        return;
    }

    categories.forEach(category => {
        container.innerHTML += `
            <div>
                <h4>${category}</h4>
                <input type="number" id="limit-${category}" value="${data[category] || ''}">
                <button onclick="saveLimit('${category}')">Save</button>
                <hr>
            </div>
        `;
    });
}


// ===== SAVE LIMIT =====
async function saveLimit(category) {
    const value = document.getElementById("limit-" + category).value;

    await fetch("/api/limits", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            category: category,
            limit: value
        })
    });

    alert("Limit saved!");
}


// ===== LOAD SUMMARY =====
async function loadSummary() {
    const res = await fetch("/api/summary");
    const data = await res.json();

    const container = document.getElementById("summaryContainer");
    container.innerHTML = "";

    data.categories.forEach(cat => {
        container.innerHTML += `
            <div>
                <strong>${cat.category}</strong><br>
                Spent: ${cat.spent} <br>
                Limit: ${cat.limit ?? "No limit"} <br>
                Status: ${cat.status}
                <hr>
            </div>
        `;
    });

    container.innerHTML += `<h3>Total Spending: ${data.total_spending}</h3>`;
}


// ===== LOAD HISTORY =====
async function loadHistory() {
    const res = await fetch("/api/expenses");
    const data = await res.json();

    const container = document.getElementById("historyContainer");
    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = "No expenses yet.";
        return;
    }

    data.forEach(item => {
        container.innerHTML += `
            <div>
                ${item.date} | ${item.description} | ${item.amount} | ${item.category}
                <hr>
            </div>
        `;
    });
}