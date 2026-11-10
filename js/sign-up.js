if (getToken()) {
  location.replace("index.html");
}

const signupForm = byId("signup-form");
const signupButton = byId("signup-btn");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignupForm(values) {
  const errors = {};

  if (!values.nickname) errors.nickname = "الاسم المستعار مطلوب";
  if (!values.username) errors.username = "اسم المستخدم مطلوب";

  if (!values.email) {
    errors.email = "البريد الإلكتروني مطلوب";
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "صيغة البريد الإلكتروني غير صحيحة";
  }

  if (!values.password) {
    errors.password = "كلمة المرور مطلوبة";
  } else if (values.password.length < 4) {
    errors.password = "كلمة المرور لازم تكون 4 حروف على الأقل";
  } else if (!/\d/.test(values.password)) {
    errors.password = "كلمة المرور لازم تحتوي على رقم واحد على الأقل";
  }

  return errors;
}

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors(signupForm);

  const values = {
    nickname: signupForm.elements.nickname.value.trim(),
    username: signupForm.elements.username.value.trim(),
    email: signupForm.elements.email.value.trim(),
    password: signupForm.elements.password.value,
  };

  const errors = validateSignupForm(values);
  if (Object.keys(errors).length > 0) {
    showFieldErrors(signupForm, errors);
    return;
  }

  setButtonLoading(signupButton, true);
  try {
    const data = await apiRequest("/create-user", {
      method: "POST",
      body: values,
    });

    saveToken(data.JWT);
    location.replace("index.html");
  } catch (error) {
    showToast(error.message, "danger");
  } finally {
    setButtonLoading(signupButton, false);
  }
});