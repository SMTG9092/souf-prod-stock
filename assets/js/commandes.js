/**
 * commandes.js - Module Commandes
 * SoufStock Enterprise ERP
 * 
 * Dynamic user loading from Supabase authentication
 * No hardcoded user information
 */

// ============================================================
// AUTHENTICATION & USER LOADING
// ============================================================

/**
 * Initialize the commandes page
 * 1. Check session
 * 2. Load authenticated user
 * 3. Display user info dynamically
 */
async function initCommandesPage() {
    try {
        // Step 1: Check if Supabase client is available
        if (typeof supabase === 'undefined' || !supabase) {
            console.error('Supabase client not initialized. Ensure config.js is loaded.');
            redirectToLogin();
            return;
        }

        // Step 2: Read current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('Session error:', sessionError.message);
            redirectToLogin();
            return;
        }

        // Step 3: No session exists → redirect to login
        if (!session) {
            console.warn('No active session found. Redirecting to login...');
            redirectToLogin();
            return;
        }

        // Step 4: Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('User error:', userError?.message || 'No user found');
            redirectToLogin();
            return;
        }

        // Step 5: Query the users table for full profile info
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('full_name, role, avatar_url, email')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.warn('Could not fetch user profile from users table:', profileError.message);
            // Fallback: use auth user metadata if available
            displayUserInfo({
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur',
                role: user.user_metadata?.role || 'Utilisateur',
                avatar_url: user.user_metadata?.avatar_url || null,
                email: user.email
            });
        } else {
            // Display user info from database
            displayUserInfo(userProfile);
        }

        // Step 6: Set up auth state listener for real-time updates
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                redirectToLogin();
            } else if (event === 'USER_UPDATED') {
                // Refresh user info if profile updated
                loadUserProfile(session.user.id);
            }
        });

        // Step 7: Initialize page-specific features
        initPageFeatures();

    } catch (err) {
        console.error('Initialization error:', err);
        redirectToLogin();
    }
}

/**
 * Load user profile from users table by ID
 */
async function loadUserProfile(userId) {
    try {
        const { data: userProfile, error } = await supabase
            .from('users')
            .select('full_name, role, avatar_url, email')
            .eq('id', userId)
            .single();

        if (!error && userProfile) {
            displayUserInfo(userProfile);
        }
    } catch (err) {
        console.error('Error loading user profile:', err);
    }
}

/**
 * Display user information in the header
 * @param {Object} userData - User data object
 */
function displayUserInfo(userData) {
    const avatarEl = document.getElementById('user-avatar');
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');

    if (!avatarEl || !nameEl || !roleEl) {
        console.warn('User display elements not found in DOM');
        return;
    }

    // Set avatar: use avatar_url if exists, otherwise default
    const avatarUrl = userData.avatar_url || 'assets/avatar-default.png';
    avatarEl.src = avatarUrl;
    avatarEl.alt = `Avatar de ${userData.full_name || 'utilisateur'}`;

    // Set full name
    nameEl.textContent = userData.full_name || userData.email?.split('@')[0] || 'Utilisateur';

    // Set role
    roleEl.textContent = userData.role || 'Utilisateur';
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    window.location.href = 'login.html';
}

// ============================================================
// PAGE FEATURES
// ============================================================

/**
 * Initialize page-specific features
 */
function initPageFeatures() {
    initNotifications();
    initKPIAnimations();
    initCardInteractions();
}

/**
 * Initialize notifications system
 */
function initNotifications() {
    const notifBtn = document.getElementById('notifications-btn');
    const notifBadge = document.getElementById('notification-badge');

    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            // TODO: Open notifications panel
            console.log('Notifications clicked');
        });
    }

    // Example: fetch real notification count from database
    // fetchNotificationCount();
}

/**
 * Animate KPI cards on page load
 */
function initKPIAnimations() {
    const kpiValues = document.querySelectorAll('.kpi-value');

    kpiValues.forEach(el => {
        const finalValue = parseFloat(el.textContent.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(finalValue)) {
            animateValue(el, 0, finalValue, 1000);
        }
    });
}

/**
 * Animate number counting
 */
function animateValue(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.floor(start + range * easeProgress);

        element.textContent = current.toLocaleString('fr-FR');

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = end.toLocaleString('fr-FR');
        }
    }

    requestAnimationFrame(update);
}

/**
 * Initialize card hover interactions
 */
function initCardInteractions() {
    const cards = document.querySelectorAll('.commande-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}

// ============================================================
// INITIALIZATION
// ============================================================

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initCommandesPage);
