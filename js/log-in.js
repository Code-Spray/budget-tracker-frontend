// لو المستخدم داخل بالفعل، مفيش لازمة للصفحة دي
if (getToken()) {
  location.replace("index.html");
}

const loginForm = byId("login-form");
const loginButton = byId("login-btn");

showFlashIfAny();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors(loginForm);

  const credentials = {
    username: loginForm.elements.username.value.trim(),
    password: loginForm.elements.password.value,
  };

  const errors = {};
  if (!credentials.username) errors.username = "اسم المستخدم مطلوب";
  if (!credentials.password) errors.password = "كلمة المرور مطلوبة";

  if (Object.keys(errors).length > 0) {
    showFieldErrors(loginForm, errors);
    return;
  }

  setButtonLoading(loginButton, true);
  try {
    const data = await apiRequest("/log-in", {
      method: "POST",
      body: credentials,
    });

    saveToken(data.JWT);
    location.replace("index.html");
  } catch (error) {
    showToast(error.message, "danger");
  } finally {
    setButtonLoading(loginButton, false);
  }
});