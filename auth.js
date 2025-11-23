// Supabase Auth Integration

const SUPABASE_URL = 'https://tixvuzausacuwuplxzvl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpeHZ1emF1c2FjdXd1cGx4enZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjQyMTEsImV4cCI6MjA3OTUwMDIxMX0.UJ6upcnnM9pSJSFy3NGuyjnFxMMHLOkt6jNvr5cIz9k';

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
function checkCredentials() {
    // No-op
    return true;
}

async function handleLogin(event) {
    event.preventDefault();

    if (!supabase) {
        checkCredentials();
        return;
    }

    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    try {
        submitBtn.textContent = '🚀 Signing in...';
        submitBtn.disabled = true;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        window.location.href = 'dashboard.html';
    } catch (error) {
        alert('Login failed: ' + error.message);
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled = false;
    }
}

async function handleVerify(event) {
    event.preventDefault();

    if (!supabase) {
        checkCredentials();
        return;
    }

    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    // Collect token from all digit inputs
    const otpInputs = form.querySelectorAll('.otp-digit');
    let token = '';
    otpInputs.forEach(input => token += input.value);

    const submitBtn = form.querySelector('button[type="submit"]');

    if (token.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }

    try {
        submitBtn.textContent = 'Verifying...';
        submitBtn.disabled = true;

        const { data, error } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'signup'
        });

        if (error) throw error;

        alert('Verification successful! Logging you in...');
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert('Verification failed: ' + error.message);
        submitBtn.innerHTML = `Verify Code <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
        submitBtn.disabled = false;
    }
}

async function handleSignup(event) {
    event.preventDefault();

    if (!supabase) {
        checkCredentials();
        return;
    }

    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) throw error;

        alert('Signup successful! Please check your email for the verification code.');

        // Switch to verify mode automatically
        if (window.toggleVerify) {
            window.toggleVerify();
            // Pre-fill email if possible, though input might be cleared by toggle logic depending on implementation
            // Ideally we keep the email value
            const emailInput = document.querySelector('input[type="email"]');
            if (emailInput) emailInput.value = email;
        }

    } catch (error) {
        alert('Signup failed: ' + error.message);
    }
}

async function logout() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    localStorage.removeItem('sb-access-token');
    localStorage.removeItem('sb-refresh-token');
    window.location.href = 'login.html';
}

async function checkAuth() {
    initSupabase();

    if (!supabase) {
        if (window.location.pathname.includes('dashboard.html')) {
            // If on dashboard and no creds, ask for them or redirect
            // For now, let's just ask
            checkCredentials();
        }
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'login.html';
    } else if (session && (window.location.pathname.includes('index.html') || window.location.pathname.includes('login.html'))) {
        window.location.href = 'dashboard.html';
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();

    // If we are on dashboard, ensure we are auth'd
    // If we are on dashboard or login, ensure we are auth'd (or not)
    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('login.html')) {
        checkAuth();
    }
});

// Expose functions globally
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleVerify = handleVerify;
window.logout = logout;
