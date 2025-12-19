// Supabase Auth Integration

const _0x5f21 = ["aHR0cHM6Ly90aXh2dXphdXNhY3V3dXBseHp2bC5zdXBhYmFzZS5jbw==", "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjeUk2SW5OMWNHRmllWE1pTENKcmVXWWlPaUowYVhaMmRYWmhkWE5oWTNWM2RYQnNlSG8yZG13aUxDSndjbXdaU0k2SW1GdWIyNHVJQ0p6ZFcxaFltRnpaU0k2TVRjMk16a3lOREl4TVN3aWVYQndJanV5TURjNU5UQXdNakV4ZlEuVUo2dXBjbm5NOTpTSlNGeTFOR3V5am5GeE1NSExPa3Q2ak52cjVjSno5aw=="];
const SUPABASE_URL = atob(_0x5f21[0]);
const SUPABASE_KEY = atob(_0x5f21[1]);

let supabase;

// Initialize Supabase
function initSupabase() {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.error('Supabase SDK not loaded');
    }
}

// Check credentials - No longer needed as they are hardcoded
// Check credentials - No longer needed as they are hardcoded
function checkCredentials() {
    // No-op
    return true;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.5s ease forwards';
            setTimeout(() => toast.remove(), 500);
        }
    }, 3000);
}

async function handleLogin(event) {
    event.preventDefault();

    if (!supabase) {
        showToast('System not initialized. Please refresh the page.', 'error');
        return;
    }

    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    try {
        if (submitBtn) submitBtn.classList.add('btn-loading');

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        window.location.href = 'dashboard.html';
    } catch (error) {
        if (submitBtn) submitBtn.classList.remove('btn-loading');
        showToast('Login failed: ' + error.message, 'error');
    }
}

async function handleVerify(event) {
    event.preventDefault();

    if (!supabase) {
        showToast('System not initialized. Please refresh the page.', 'error');
        return;
    }

    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const otpInputs = form.querySelectorAll('.otp-digit');
    let token = '';
    otpInputs.forEach(input => token += input.value);

    const submitBtn = form.querySelector('button[type="submit"]');

    if (token.length !== 8) {
        showToast('Please enter a valid 8-digit code', 'error');
        return;
    }

    try {
        if (submitBtn) submitBtn.classList.add('btn-loading');

        const { data, error } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup'
        });

        if (error) throw error;

        showToast('Verification successful! Logging you in...', 'success');
        window.location.href = 'dashboard.html';
    } catch (error) {
        if (submitBtn) submitBtn.classList.remove('btn-loading');
        showToast('Verification failed: ' + error.message, 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();

    if (!supabase) {
        showToast('System not initialized. Please refresh the page.', 'error');
        return;
    }

    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    try {
        if (submitBtn) submitBtn.classList.add('btn-loading');

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) throw error;

        showToast('Signup successful! Please check your email for the verification code.', 'success');

        // Switch to verify mode automatically
        if (window.toggleVerify) {
            window.toggleVerify();
            // Pre-fill email if possible, though input might be cleared by toggle logic depending on implementation
            // Ideally we keep the email value
            const emailInput = document.querySelector('input[type="email"]');
            if (emailInput) emailInput.value = email;
        }

    } catch (error) {
        if (submitBtn) submitBtn.classList.remove('btn-loading');
        showToast('Signup failed: ' + error.message, 'error');
    }
}

async function resendCode() {
    if (!supabase) {
        showToast('System not initialized. Please refresh the page.', 'error');
        return;
    }

    const email = document.querySelector('input[type="email"]').value;
    if (!email) {
        showToast('Please enter your email address first', 'error');
        return;
    }

    try {
        showToast('Sending new code...', 'success');
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });

        if (error) throw error;

        showToast('New code sent! Check your email.', 'success');
    } catch (error) {
        showToast('Failed to resend: ' + error.message, 'error');
    }
}

async function logout() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    window.location.href = 'index.html';
}

async function checkAuth() {
    initSupabase();

    if (!supabase) {
        if (window.location.pathname.includes('dashboard')) {
            // If on dashboard and no creds, ask for them or redirect
            // For now, let's just ask
            checkCredentials();
        }
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session && window.location.pathname.includes('dashboard')) {
        window.location.href = 'login.html';
    } else if (session && (window.location.pathname === '/' || window.location.pathname.includes('index') || window.location.pathname.includes('login'))) {
        window.location.href = 'dashboard.html';
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();

    // If we are on dashboard, ensure we are auth'd
    // If we are on dashboard or login, ensure we are auth'd (or not)
    if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('login')) {
        checkAuth();
    }
});

// Expose functions globally
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleVerify = handleVerify;
window.resendCode = resendCode;
window.logout = logout;
