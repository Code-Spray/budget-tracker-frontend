let form = document.querySelector(".log-in-form")

form.addEventListener("submit", async (ev) => {
    ev.preventDefault()
    let formObject = JSON.stringify({
        username: form.username.value,
        password: form.password.value
    })
    console.log(formObject)
    try {
        let res = await fetch(`${basePath}/log-in`, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true"
            },
            body: formObject
        })
        const jsonres = await res.json()
        console.log("jsonres = ", jsonres)
        localStorage.setItem("token", jsonres.JWT)
    } catch (error) {
        console.log("error trying to add user : ", error)
    }
    location.href = `./index.html`
})