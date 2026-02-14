// ===== HELPERS =====
const $ = (id) => document.getElementById(id);

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + " đ";
}

function showOnly(pageId) {
    ["addPage", "budgetPage", "summaryPage"].forEach(id => {
        $(id).classList.add("hidden");
    });
    $(pageId).classList.remove("hidden");
}

// ===== NAVIGATION =====
function showPage(page) {
    if (page === "add") {
        $("pageTitle").innerText = "Add Expense";
        showOnly("addPage");
    }

    if (page === "budget") {
        $("pageTitle").innerText = "Set Budget";
        showOnly("budgetPage");
        loadLimits();
    }

    if (page === "summary") {
        $("pageTitle").innerText = "Summary";
        showOnly("summaryPage");
        loadSummary();
        loadHistory();
    }
}

// ===== ADD EXPENSE =====
async function addExpense() {
    const description = $("description").value.trim();
    const amount = Number($("amount").value);

    if (!description || isNaN(amount) || amount <= 0) {
        alert("Invalid input");
        return;
    }

    try {
        const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description, amount })
        });

        if (!res.ok) throw new Error();

        alert("Expense added!");
        $("description").value = "";
        $("amount").value = "";
    } catch (err) {
        alert("Error adding expense");
    }
}

// ===== LOAD LIMITS =====
async function loadLimits() {
    try {
        const res = await fetch("/api/limits");
        const data = await res.json();

        const container = $("limitContainer");
        container.innerHTML = "";

        const categories = Object.keys(data);

        if (!categories.length) {
            container.innerText = "No categories yet.";
            return;
        }

        const fragment = document.createDocumentFragment();

        categories.forEach(category => {
            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="card-title">${category}</div>
                <input type="number" id="limit-${category}" 
                       value="${data[category] || ''}" 
                       placeholder="Set limit">
                <button>Save</button>
            `;

            card.querySelector("button")
                .addEventListener("click", () => saveLimit(category));

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    } catch (err) {
        console.error("Load limits error", err);
    }
}

// ===== SAVE LIMIT =====
async function saveLimit(category) {
    const value = Number($("limit-" + category).value);

    if (isNaN(value) || value < 0) {
        alert("Invalid limit");
        return;
    }

    await fetch("/api/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, limit: value })
    });

    alert("Limit saved!");
}

// ===== LOAD SUMMARY =====
async function loadSummary() {
    try {
        const res = await fetch("/api/summary");
        const data = await res.json();

        const container = $("summaryContainer");
        container.innerHTML = "";

        const fragment = document.createDocumentFragment();

        data.categories.forEach(cat => {
            const percent = cat.limit > 0
                ? Math.min((cat.spent / cat.limit) * 100, 100)
                : 0;

            let color = "#4caf50";
            if (percent >= 100) color = "#ef4444";
            else if (percent >= 70) color = "#f59e0b";

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="card-title">${cat.category}</div>
                <div class="card-amount">
                    ${formatMoney(cat.spent)} 
                    ${cat.limit ? "/ " + formatMoney(cat.limit) : ""}
                </div>
                ${cat.limit ? `
                    <div class="progress">
                        <div class="progress-bar" 
                             style="width:${percent}%; background:${color}">
                        </div>
                    </div>
                ` : ""}
            `;

            fragment.appendChild(card);
        });

        // total
        const totalBar = document.createElement("div");
        totalBar.className = "total-bar";
        totalBar.innerHTML = `
            <span>Total Spending</span>
            <span>${formatMoney(data.total_spending)}</span>
        `;
        fragment.appendChild(totalBar);

        container.appendChild(fragment);
    } catch (err) {
        console.error("Load summary error", err);
    }
}

// ===== LOAD HISTORY =====
async function loadHistory() {
    try {
        const res = await fetch("/api/expenses");
        const data = await res.json();

        const container = $("historyContainer");
        container.innerHTML = "";

        if (!data.length) {
            container.innerText = "No expenses yet.";
            return;
        }

        const fragment = document.createDocumentFragment();

        data.forEach(item => {
            const card = document.createElement("div");
            card.className = "history-card";

            card.innerHTML = `
                <div class="history-top">
                    <div class="history-title">${item.description}</div>
                    <div class="history-amount">${formatMoney(item.amount)}</div>
                </div>
                <div class="history-meta">
                    ${new Date(item.date).toLocaleString("vi-VN")} • ${item.category}
                </div>
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    } catch (err) {
        console.error("Load history error", err);
    }
}