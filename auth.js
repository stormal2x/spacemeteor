// Authentication and Login Functions

function freeAccess() {
    // Store a simple session flag
    sessionStorage.setItem('tradeJournalAuth', 'free-access');
    
    // Add a nice animation before redirect
    const btn = event.target.closest('button');
    btn.innerHTML = '<span>Loading...</span>';
    btn.style.opacity = '0.7';
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 500);
}

function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    
    // For demo purposes, accept any credentials
    // In production, you would validate against a backend
    
    if (email && password) {
        sessionStorage.setItem('tradeJournalAuth', 'logged-in');
        sessionStorage.setItem('userEmail', email);
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    }
}

// Check if user is authenticated when loading dashboard
function checkAuth() {
    const auth = sessionStorage.getItem('tradeJournalAuth');
    
    if (!auth && window.location.pathname.includes('dashboard.html')) {
        window.location.href = 'index.html';
    }
}

// Run auth check on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}

function logout() {
    sessionStorage.removeItem('tradeJournalAuth');
    sessionStorage.removeItem('userEmail');
    window.location.href = 'index.html';
}
