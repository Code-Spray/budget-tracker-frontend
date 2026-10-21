let form = document.querySelector(".sign-up-form")

form.addEventListener("submit", async (ev) => {
    ev.preventDefault()
    let formObject = JSON.stringify({
        nickname: form.nickname.value,
        username: form.username.value,
        email: form.email.value,
        password: form.password.value
    })
    console.log(formObject)
    try {
        let res = await fetch(`${basePath}/create-user`, {
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