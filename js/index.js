// =====================================================
// index.js — لوحة المعاملات
// =====================================================

// -------- Guard: لازم يكون داخل --------
if (!getToken()) {
    location.replace("log-in.html");
}

// =====================================================
// الحالة (State)
// =====================================================
let transactions = [];              // كل المعاملات من السيرفر
let activeTypeFilter = "all";       // all | income | outcome
let searchQuery = "";
let selectedTransaction = null;     // المستخدمة في مودال التعديل والحذف

// =====================================================
// عناصر الصفحة
// =====================================================
const transactionsBody = byId("transactions-body");
const tableWrapper = byId("table-wrap");
const loadingIndicator = byId("loading");
const emptyState = byId("empty-state");
const emptyMessage = byId("empty-message");

const addForm = byId("add-form");
const addButton = byId("add-btn");
const editForm = byId("edit-form");
const editSaveButton = byId("edit-save-btn");
const deleteConfirmButton = byId("delete-confirm-btn");
const searchInput = byId("search-input");
const logoutButton = byId("logout-btn");

const editModal = new bootstrap.Modal(byId("edit-modal"));
const deleteModal = new bootstrap.Modal(byId("delete-modal"));

// =====================================================
// دوال التنسيق (Utilities)
// =====================================================
function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number > 1e15) return "unexpected format";

    const formater = new Intl.NumberFormat("en-US", {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 2
    })
    console.log(formater.format(number))
    return formater.format(number)
}

function parseDate(value) {
    if (!value) return null;

    const text = String(value);
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
        return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }

    const date = new Date(text);
    return isNaN(date.getTime()) ? null : date;
}

function padTwoDigits(number) {
    return String(number).padStart(2, "0");
}

function formatDate(value) {
    const date = parseDate(value);
    if (!date) return "—";

    return `${date.getFullYear()}/${padTwoDigits(date.getMonth() + 1)}/${padTwoDigits(date.getDate())}`;
}

function toDateInputValue(value) {
    const date = parseDate(value);
    if (!date) return "";

    return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;
}

// =====================================================
// جلب البيانات من السيرفر
// =====================================================
async function loadTransactions({ showSpinner = true } = {}) {
    if (showSpinner) {
        loadingIndicator.classList.remove("d-none");
        emptyState.classList.add("d-none");
        tableWrapper.classList.add("d-none");
    }

    try {
        const data = await apiRequest("/all-transactions", { requiresAuth: true });
        transactions = Array.isArray(data) ? data : [];
        renderPage();
    } catch (error) {
        if (error.isAuthError) return; // الـ redirect اتعمل خلاص

        showToast(error.message, "danger");

        if (showSpinner) {
            emptyMessage.textContent = "تعذّر تحميل المعاملات، جرّب تعمل Refresh للصفحة";
            emptyState.classList.remove("d-none");
            tableWrapper.classList.add("d-none");
        }
    } finally {
        loadingIndicator.classList.add("d-none");
    }
}

// =====================================================
// العرض (Rendering)
// =====================================================
function renderPage() {
    renderSummaryCards();
    renderTransactionsTable();
}

function renderSummaryCards() {
    let totalIncome = 0;
    let totalOutcome = 0;

    transactions.forEach((transaction) => {
        const amount = Number(transaction.amount) || 0;
        if (transaction.transaction_type === "income") totalIncome += amount;
        else if (transaction.transaction_type === "outcome") totalOutcome += amount;
    });

    const balance = totalIncome - totalOutcome;

    byId("total-income").textContent = formatMoney(totalIncome);
    byId("total-outcome").textContent = formatMoney(totalOutcome);
    byId("balance").textContent = formatMoney(balance);

    const balanceWrapper = byId("balance-wrap");
    balanceWrapper.classList.toggle("text-success", balance >= 0);
    balanceWrapper.classList.toggle("text-danger", balance < 0);
}

// -------- اختيار المعاملات اللي هتتعرض حسب الفلتر والبحث --------
function getVisibleTransactions() {
    const query = searchQuery.trim().toLowerCase();

    return transactions
        .filter((transaction) => activeTypeFilter === "all" || transaction.transaction_type === activeTypeFilter)
        .filter((transaction) => String(transaction.source ?? "").toLowerCase().includes(query))
        .sort((a, b) => {
            const dateA = parseDate(a.transaction_date);
            const dateB = parseDate(b.transaction_date);
            const timeA = dateA ? dateA.getTime() : 0;
            const timeB = dateB ? dateB.getTime() : 0;

            if (timeB !== timeA) return timeB - timeA;
            return Number(b.transaction_id) - Number(a.transaction_id);
        });
}

// -------- بناء HTML لصف واحد --------
function buildTransactionRowHtml(transaction) {
    const isIncome = transaction.transaction_type === "income";
    const typeBadgeClass = isIncome ? "text-bg-success" : "text-bg-danger";
    const typeLabel = isIncome ? "دخل" : "مصروف";
    const amountClass = isIncome ? "text-success" : "text-danger";

    return `
    <tr>
      <td>${escapeHtml(transaction.transaction_id)}</td>
      <td><span class="badge ${typeBadgeClass}">${typeLabel}</span></td>
      <td class="${amountClass} fw-semibold">
        <span class="num">${formatMoney(transaction.amount)}</span>
      </td>
      <td class="source-cell">${escapeHtml(transaction.source)}</td>
      <td><span class="num">${formatDate(transaction.transaction_date)}</span></td>
      <td>
        <div class="d-flex gap-1">
          <button type="button" class="btn btn-sm btn-outline-primary"
                  data-action="edit" data-id="${transaction.transaction_id}">
            تعديل
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger"
                  data-action="delete" data-id="${transaction.transaction_id}">
            حذف
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderTransactionsTable() {
    const visibleTransactions = getVisibleTransactions();
    transactionsBody.innerHTML = "";

    if (visibleTransactions.length === 0) {
        emptyMessage.textContent = transactions.length === 0
            ? "مفيش معاملات لسه، ضيف أول معاملة من الفورم اللي فوق"
            : "مفيش نتايج مطابقة للفلتر أو البحث";

        emptyState.classList.remove("d-none");
        tableWrapper.classList.add("d-none");
        return;
    }

    emptyState.classList.add("d-none");
    tableWrapper.classList.remove("d-none");

    transactionsBody.innerHTML = visibleTransactions.map(buildTransactionRowHtml).join("");
}

// =====================================================
// Event Delegation: listener واحد للجدول كله
// =====================================================
transactionsBody.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) return;

    const transactionId = Number(actionButton.dataset.id);
    const transaction = transactions.find(
        (item) => Number(item.transaction_id) === transactionId
    );
    if (!transaction) return;

    if (actionButton.dataset.action === "edit") {
        openEditModal(transaction);
    } else if (actionButton.dataset.action === "delete") {
        openDeleteModal(transaction);
    }
});

// =====================================================
// Validation
// =====================================================
function readTransactionForm(form) {
    return {
        transaction_type: form.elements.transaction_type.value,
        amount: form.elements.amount.value.trim(),
        source: form.elements.source.value.trim(),
        transaction_date: form.elements.transaction_date.value,
    };
}

function validateTransaction(values) {
    const errors = {};

    if (values.transaction_type !== "income" && values.transaction_type !== "outcome") {
        errors.transaction_type = "اختار النوع";
    }

    const amount = Number(values.amount);
    if (values.amount === "") {
        errors.amount = "المبلغ مطلوب";
    } else if (!Number.isFinite(amount) || amount <= 0) {
        errors.amount = "المبلغ لازم يكون رقم أكبر من صفر";
    }
    else if (amount >= 1e15) {
        errors.amount = "المبلغ لازم يكون اقل من 1e15 ";
    }

    if (!values.source) {
        errors.source = "المصدر / الوصف مطلوب";
    }

    return errors;
}

function buildTransactionBody(values) {
    const body = {
        transaction_type: values.transaction_type,
        amount: Number(values.amount),
        source: values.source,
    };

    if (values.transaction_date) {
        body.transaction_date = values.transaction_date;
    }

    return body;
}

// =====================================================
// إضافة معاملة
// =====================================================
addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(addForm);

    const values = readTransactionForm(addForm);
    const errors = validateTransaction(values);

    if (Object.keys(errors).length > 0) {
        showFieldErrors(addForm, errors);
        return;
    }

    setButtonLoading(addButton, true);
    try {
        await apiRequest("/create-transaction", {
            method: "POST",
            body: buildTransactionBody(values),
            requiresAuth: true,
        });

        showToast("تمت إضافة المعاملة بنجاح");
        addForm.reset();
        await loadTransactions({ showSpinner: false });
    } catch (error) {
        if (!error.isAuthError) showToast(error.message, "danger");
    } finally {
        setButtonLoading(addButton, false);
    }
});

// =====================================================
// تعديل معاملة
// =====================================================
function openEditModal(transaction) {
    selectedTransaction = transaction;
    clearFieldErrors(editForm);

    editForm.elements.transaction_type.value = transaction.transaction_type;
    editForm.elements.amount.value = String(Number(transaction.amount));
    editForm.elements.source.value = transaction.source ?? "";
    editForm.elements.transaction_date.value = toDateInputValue(transaction.transaction_date);

    editModal.show();
}

editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(editForm);

    const values = readTransactionForm(editForm);
    const errors = validateTransaction(values);

    if (Object.keys(errors).length > 0) {
        showFieldErrors(editForm, errors);
        return;
    }

    setButtonLoading(editSaveButton, true);
    try {
        await apiRequest("/edit-transaction", {
            method: "PUT",
            body: {
                transaction_id: Number(selectedTransaction.transaction_id),
                ...buildTransactionBody(values),
            },
            requiresAuth: true,
        });

        editModal.hide();
        showToast("تم تعديل المعاملة بنجاح");
        await loadTransactions({ showSpinner: false });
    } catch (error) {
        if (error.isAuthError) return;

        showToast(error.message, "danger");

        if (error.status === 404) {
            editModal.hide();
            await loadTransactions({ showSpinner: false });
        }
    } finally {
        setButtonLoading(editSaveButton, false);
    }
});

// =====================================================
// حذف معاملة
// =====================================================
function openDeleteModal(transaction) {
    selectedTransaction = transaction;
    byId("delete-source").textContent = transaction.source ?? "";
    deleteModal.show();
}

deleteConfirmButton.addEventListener("click", async () => {
    setButtonLoading(deleteConfirmButton, true);
    try {
        await apiRequest(
            "/delete-transaction?id=" + encodeURIComponent(selectedTransaction.transaction_id),
            { method: "DELETE", requiresAuth: true }
        );

        deleteModal.hide();
        showToast("تم حذف المعاملة");
        await loadTransactions({ showSpinner: false });
    } catch (error) {
        if (!error.isAuthError) showToast(error.message, "danger");
    } finally {
        setButtonLoading(deleteConfirmButton, false);
    }
});

// =====================================================
// الفلتر والبحث وتسجيل الخروج
// =====================================================
document.querySelectorAll("input[name='filter']").forEach((radioButton) => {
    radioButton.addEventListener("change", () => {
        activeTypeFilter = radioButton.value;
        renderTransactionsTable();
    });
});

searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    renderTransactionsTable();
});

logoutButton.addEventListener("click", () => {
    deleteToken();
    location.replace("log-in.html");
});

// =====================================================
// تشغيل الصفحة
// =====================================================
loadTransactions();