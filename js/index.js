let token = ""

async function checkToken() {
    const saved = localStorage.getItem("token")
    if (!saved) return false
    try {
        const res = await fetch("http://localhost:3100/all-transactions", {
            method: "get",
            headers: { "Authorization": `Bearer ${saved}` }
        })
        if (!res.ok) {
            localStorage.removeItem("token")   // توكن باظ أو انتهى
            return false
        }
        token = saved
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}

function updateAuthUI(isLoggedIn) {
    document.querySelector(".log-in").style.display = isLoggedIn ? "none" : "inline"
    document.querySelector(".sign-up").style.display = isLoggedIn ? "none" : "inline"
    document.querySelector(".log-out").style.display = isLoggedIn ? "inline" : "none"
}

function logOut(btn) {
    btn.addEventListener("click", () => {
        localStorage.removeItem("token")
        token = ""
        location.reload()   // init() هيظبط الـ UI لوحده
    })
}

async function getTransactions() {
    try {
        const res = await fetch("http://localhost:3100/all-transactions", {
            method: "get",
            headers: { "Authorization": `Bearer ${token}` }
        })
        const transactionsJson = await res.json()
        console.log("transactionsJson = ", transactionsJson)
        return transactionsJson
    } catch (error) {
        return error
    }
}

async function editTransaction(transactionOb) {
    transactionOb = JSON.stringify(transactionOb)
    const res = await fetch("http://localhost:3100/edit-transaction", {
        method: "put",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: transactionOb
    })
    const resjson = res.json()
    console.log(resjson)
    return resjson
}

async function deleteTransaction(id) {
    try {
        const res = await fetch(`http://localhost:3100/delete-transaction?id=${id}`, {
            method: "delete",
            headers: { "Authorization": `Bearer ${token}` }
        })
        const resjson = res.json()
        console.log(resjson)
        return resjson
    } catch (error) {
        console.log("Error in Daleting data from the server")
    }
}

async function renderAllTransactions() {
    let transactionsContainer = document.querySelector(".transactions")
    transactionsContainer.innerHTML = ""
    try {
        const transactions = await getTransactions()
        if (transactions.length > 0) {
            transactions.forEach(transactionOb => {
                transactionsContainer.insertAdjacentHTML("beforeend", `
                        <tr class="transaction ${transactionOb.transaction_type.toLowerCase()}">
                            <th class="transaction-id" scope="row">${transactionOb.transaction_id}</th>
                            <td class="transaction-type">${transactionOb.transaction_type}</td>
                            <td class="amount">${transactionOb.amount}</td>
                            <td class="source">${transactionOb.source}</td>
                            <td class="final-colomn transaction-date">
                            ${transactionOb.transaction_date}
                                <div class="tools">
                                    <img class="edit" src="images/pen.svg" alt="pen">
                                    <img class="delete" src="images/trash.svg" alt="trash">
                                </div>
                            </td>
                        </tr>
                    `)
            });
        }
        else {
            transactionsContainer.innerHTML = "<h1>There are No transactions</h1>"
        }
    } catch (error) {
        transactionsContainer.innerHTML = "<h1>There are an ERROR</h1>"
    }
    getEditToWork()
    getDeleteToWork()
}

async function sendFormData(form) {

    let reqbody = JSON.stringify({
        amount: Number(form.amount.value),
        transaction_type: form.transaction_type.value,
        source: form.source.value,
        transaction_date: form.transaction_date.value
    })
    console.log("body = ", reqbody)
    try {
        const res = await fetch("http://localhost:3100/create-transaction", {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: reqbody
        })
        return Promise.resolve(reqbody)
    } catch (error) {
        console.log("Error in the fetch : ", error)
    }
}

function getEditToWork() {
    let transactionsArray = Array.from(document.querySelectorAll(".transaction"))
    transactionsArray.forEach(element => {
        element.addEventListener("click", (ev) => {
            if (ev.target.classList.contains("edit")) {

                let transaction_id = Number(element.querySelector(".transaction-id").textContent)
                let transaction_type = element.querySelector(".transaction-type").textContent.toLowerCase()
                let amount = element.querySelector(".amount").textContent
                let source = element.querySelector(".source").textContent
                // let transaction_date = element.querySelector(".transaction-date").textContent
                let incomeState = ""
                let outcomeState = ""
                if (transaction_type === "income") {
                    incomeState = "selected"
                }
                else if (transaction_type === "outcome") {
                    outcomeState = "selected"
                }
                element.innerHTML = `
                            <th class="transaction-id" scope="row">${transaction_id}</th>
                            <td class="transaction-type">
                                <select name="transaction_type" id="transaction_type">
                                    <option value="income" ${incomeState}>income</option>
                                    <option value="outcome" ${outcomeState}>outcome</option>
                                </select>
                            </td>
                            <td class="amount">
                                <input type="number" name="amount" id="amount" value="${amount}">
                            </td>
                            <td class="source">
                                <input type="text" name="source" value="${source}">
                            </td>
                            <td class="final-colomn transaction-date">
                                <input type="date" name="transaction_date" >
                                <div class="tools">
                                    <button class="btn btn-primary enter">Enter</button>
                                    <button class="btn btn-primary cancle">Cancele</button>
                                </div>
                            </td>
                `

                const typeSelect = element.querySelector("select[name='transaction_type']")
                const amountInput = element.querySelector("input[name='amount']")
                const sourceInput = element.querySelector("input[name='source']")
                const dateInput = element.querySelector("input[name='transaction_date']")

                const enterBtn = element.querySelector(".enter")
                const cancelBtn = element.querySelector(".cancle")

                enterBtn.addEventListener("click", () => {
                    const transactionOb = {
                        transaction_type: typeSelect.value,
                        amount: Number(amountInput.value),
                        source: sourceInput.value,
                        transaction_date: dateInput.value || null,
                        transaction_id: transaction_id
                    }
                    console.log(transactionOb)
                    editTransaction(transactionOb)
                        .then(() => renderAllTransactions())
                })
                cancelBtn.addEventListener("click", () => renderAllTransactions())
            }
        })
    })
}

function getDeleteToWork() {
    let transactionsArray = Array.from(document.querySelectorAll(".transaction"))
    transactionsArray.forEach(element => {
        element.addEventListener("click", (ev) => {
            if (ev.target.classList.contains("delete")) {
                let id = element.querySelector(".transaction-id").innerHTML
                console.log(Number(id))
                deleteTransaction(Number(id))
                    .then(() => renderAllTransactions())
            }
        })
    })
}

async function init() {
    const isLoggedIn = await checkToken()
    updateAuthUI(isLoggedIn)
    logOut(document.querySelector(".log-out"))

    if (!isLoggedIn){
        document.querySelector(".welcome").style.display = "block"
        document.querySelector(".main-content").style.display = "none"
        return
    } 
    
    document.querySelector(".welcome").style.display = "none"
    document.querySelector(".main-content").style.display = "block"

    renderAllTransactions()
    const form = document.querySelector(".adding-form")
    form.addEventListener("submit", (ev) => {
        ev.preventDefault()
        sendFormData(form).then(() => renderAllTransactions())
    })
}

init()