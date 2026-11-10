// =====================================================
// api.js — الدوال المشتركة بين كل الصفحات
// =====================================================
const API_BASE_URL = 'https://expire-arrival-deprecate.ngrok-free.dev';
const TOKEN_STORAGE_KEY = 'jwt';
const FLASH_STORAGE_KEY = 'flash';

// -------- اختصار واضح بدل $ --------
function byId(elementId) {
  return document.getElementById(elementId);
}

// -------- التوكن --------
function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function saveToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function deleteToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// -------- Flash message بين الصفحات --------
function setFlashMessage(message) {
  sessionStorage.setItem(FLASH_STORAGE_KEY, message);
}

function showFlashIfAny() {
  const message = sessionStorage.getItem(FLASH_STORAGE_KEY);
  if (!message) return;

  sessionStorage.removeItem(FLASH_STORAGE_KEY);
  showToast(message, 'danger');
}

// -------- لما التوكن ينتهي --------
function handleSessionExpired() {
  deleteToken();
  setFlashMessage('انتهت الجلسة، سجّل دخول تاني');
  location.replace('log-in.html');
}

// -------- الدالة الأساسية للاتصال بالـ API --------
async function apiRequest(path, { method = 'GET', body = null, requiresAuth = false } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  };

  if (requiresAuth) {
    headers['Authorization'] = 'Bearer ' + getToken();
  }

  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new Error('مش قادر أتصل بالسيرفر. اتأكد إن الباك إند شغال على ' + API_BASE_URL);
  }

  const data = await response.json().catch(() => null);

  if (requiresAuth && response.status === 401) {
    handleSessionExpired();
    const authError = new Error('انتهت الجلسة');
    authError.isAuthError = true;
    throw authError;
  }

  if (!response.ok) {
    const error = new Error(
      (data && data.message) || 'حصل خطأ غير متوقع (' + response.status + ')'
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

// -------- Toast (بيشتغل حتى لو Bootstrap مش متحمّل) --------
function showToast(message, type = 'success') {
  let container = byId('toast-container');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className =
      'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
    container.style.zIndex = '2000';
    document.body.appendChild(container);
  }

  const toastElement = document.createElement('div');
  toastElement.className = 'toast align-items-center border-0 text-bg-' + type;
  toastElement.setAttribute('role', 'alert');

  const wrapper = document.createElement('div');
  wrapper.className = 'd-flex';

  const body = document.createElement('div');
  body.className = 'toast-body';
  body.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'btn-close btn-close-white m-auto mx-2';
  closeButton.setAttribute('aria-label', 'إغلاق');

  wrapper.append(body, closeButton);
  toastElement.appendChild(wrapper);
  container.appendChild(toastElement);

  // لو Bootstrap متاح استخدمه، وإلا اعرض يدوي
  if (window.bootstrap && typeof bootstrap.Toast === 'function') {
    const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    toast.show();
  } else {
    toastElement.classList.add('show');
    toastElement.style.display = 'block';
    closeButton.addEventListener('click', () => toastElement.remove());
    setTimeout(() => toastElement.remove(), 4000);
  }
}

// -------- أخطاء الحقول --------
function clearFieldErrors(form) {
  form.querySelectorAll('.is-invalid').forEach((input) => {
    input.classList.remove('is-invalid');
  });
}

function showFieldErrors(form, errorsByFieldName) {
  Object.entries(errorsByFieldName).forEach(([fieldName, message]) => {
    const input = form.elements[fieldName];
    if (!input) return;

    input.classList.add('is-invalid');
    const feedback = input.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = message;
  });
}

// -------- Spinner على الزر --------
function setButtonLoading(button, isLoading) {
  button.disabled = isLoading;
  const existingSpinner = button.querySelector('.spinner-border');

  if (isLoading && !existingSpinner) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner-border spinner-border-sm ms-2';
    spinner.setAttribute('aria-hidden', 'true');
    button.appendChild(spinner);
  } else if (!isLoading && existingSpinner) {
    existingSpinner.remove();
  }
}

// -------- Escape لبيانات المستخدم قبل حقنها كـ HTML --------
function escapeHtml(text) {
  const temp = document.createElement('div');
  temp.textContent = String(text ?? '');
  return temp.innerHTML;
}