// ============================================================
// SoufStock ERP/WMS - Utilisateurs Module
// pages/utilisateurs/script.js
// Depends on: ../../assets/js/config.js, ../../assets/js/utils.js, ../../assets/js/auth.js
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    var CONFIG = {
        TABLE: 'user_profiles',
        ROLES_TABLE: 'roles',
        PERMISSIONS_TABLE: 'permissions',
        ROLE_PERMISSIONS_TABLE: 'role_permissions',
        DEFAULT_PAGE_SIZE: 10,
        SEARCH_DEBOUNCE_MS: 300,
        TOAST_DURATION_MS: 4000
    };

    // ============================================================
    // MODULE STATE
    // ============================================================
    var state = {
        users: [],
        roles: [],
        currentUser: null,
        currentProfile: null,
        currentRole: null,
        currentPage: 1,
        pageSize: 10,
        totalCount: 0,
        sortColumn: 'nom',
        sortDirection: 'asc',
        searchQuery: '',
        roleFilter: '',
        serviceFilter: '',
        statusFilter: '',
        langFilter: '',
        themeFilter: '',
        selectedUserId: null,
        deleteUserId: null,
        selectedRows: new Set(),
        canEdit: false,
        canDelete: false,
        canCreate: false,
        canExport: false
    };

    // ============================================================
    // DOM CACHE
    // ============================================================
    var dom = {};

    function cacheDOM() {
        dom.usersTableBody = document.getElementById('usersTableBody');
        dom.paginationInfo = document.getElementById('paginationInfo');
        dom.paginationControls = document.getElementById('paginationControls');
        dom.searchInput = document.getElementById('searchInput');
        dom.roleFilterSelect = document.getElementById('roleFilter');
        dom.serviceFilterSelect = document.getElementById('serviceFilter');
        dom.statusFilterSelect = document.getElementById('statusFilter');
        dom.langFilterSelect = document.getElementById('langFilter');
        dom.themeFilterSelect = document.getElementById('themeFilter');
        dom.pageSizeSelect = document.getElementById('pageSizeSelect');
        dom.refreshBtn = document.getElementById('refreshBtn');
        dom.addUserBtn = document.getElementById('addUserBtn');
        dom.exportExcelBtn = document.getElementById('exportExcelBtn');
        dom.exportPdfBtn = document.getElementById('exportPdfBtn');
        dom.printBtn = document.getElementById('printBtn');
        dom.userModal = document.getElementById('userModal');
        dom.modalTitle = document.getElementById('modalTitle');
        dom.modalClose = document.getElementById('modalClose');
        dom.modalCancel = document.getElementById('modalCancel');
        dom.modalSave = document.getElementById('modalSave');
        dom.userForm = document.getElementById('userForm');
        dom.viewModal = document.getElementById('viewModal');
        dom.viewModalClose = document.getElementById('viewModalClose');
        dom.viewModalCloseBtn = document.getElementById('viewModalCloseBtn');
        dom.deleteModal = document.getElementById('deleteModal');
        dom.deleteModalClose = document.getElementById('deleteModalClose');
        dom.deleteCancel = document.getElementById('deleteCancel');
        dom.deleteConfirm = document.getElementById('deleteConfirm');
        dom.toastContainer = document.getElementById('toastContainer');
        dom.selectAll = document.getElementById('selectAll');
        dom.statTotal = document.getElementById('statTotal');
        dom.statActive = document.getElementById('statActive');
        dom.statInactive = document.getElementById('statInactive');
        dom.statAdmins = document.getElementById('statAdmins');
        dom.statServices = document.getElementById('statServices');
        dom.userNom = document.getElementById('userNom');
        dom.userPrenom = document.getElementById('userPrenom');
        dom.userNomComplet = document.getElementById('userNomComplet');
        dom.userUsername = document.getElementById('userUsername');
        dom.userEmail = document.getElementById('userEmail');
        dom.userMatricule = document.getElementById('userMatricule');
        dom.userTelephone = document.getElementById('userTelephone');
        dom.userRole = document.getElementById('userRole');
        dom.userService = document.getElementById('userService');
        dom.userPoste = document.getElementById('userPoste');
        dom.userLangue = document.getElementById('userLangue');
        dom.userTheme = document.getElementById('userTheme');
        dom.userPhoto = document.getElementById('userPhoto');
        dom.userActif = document.getElementById('userActif');
        dom.userId = document.getElementById('userId');
        dom.viewAvatar = document.getElementById('viewAvatar');
        dom.viewName = document.getElementById('viewName');
        dom.viewRole = document.getElementById('viewRole');
        dom.viewGrid = document.getElementById('viewGrid');
        dom.deleteUserName = document.getElementById('deleteUserName');
        dom.deleteUserEmail = document.getElementById('deleteUserEmail');
    }

    // ============================================================
    // SUPABASE CLIENT ACCESSOR
    // ============================================================
    function getClient() {
        return window.supabaseClient || (typeof getClient === 'function' ? null : null);
    }

    // ============================================================
    // AUTHENTICATION (delegated to auth.js)
    // ============================================================
    async function initAuth() {
        if (window.SoufStockAuth && typeof window.SoufStockAuth.checkSession === 'function') {
            return await window.SoufStockAuth.checkSession();
        }
        // Fallback inline
        var client = getClient();
        if (!client) {
            redirectToLogin();
            return false;
        }
        try {
            var result = await client.auth.getSession();
            var session = result.data ? result.data.session : null;
            if (!session) {
                var stored = localStorage.getItem('soufstock_session') || sessionStorage.getItem('soufstock_session');
                if (!stored) { redirectToLogin(); return false; }
            }
            state.currentUser = session ? session.user : null;
            return true;
        } catch (e) { redirectToLogin(); return false; }
    }

    async function loadCurrentUserProfile() {
        var client = getClient();
        if (!client || !state.currentUser) return;
        try {
            var result = await client.from('user_profiles')
                .select('*, roles(*)')
                .eq('id', state.currentUser.id)
                .single();
            if (!result.error && result.data) {
                state.currentProfile = result.data;
                state.currentRole = result.data.roles || null;
            }
        } catch (e) { console.error('Load current user profile error:', e); }
    }

    function redirectToLogin() {
        window.location.href = 'login.html';
    }

    // ============================================================
    // PERMISSIONS (delegated to auth.js hasPermission)
    // ============================================================
    function checkPermission(code) {
        if (typeof hasPermission === 'function') {
            return hasPermission(code);
        }
        if (window.SoufStockAuth && typeof window.SoufStockAuth.hasPermission === 'function') {
            return window.SoufStockAuth.hasPermission(code);
        }
        // Fallback: admin has all permissions
        if (state.currentRole && state.currentRole.nom && state.currentRole.nom.toLowerCase().includes('admin')) {
            return true;
        }
        return false;
    }

    function updateUIBasedOnPermissions() {
        state.canCreate = checkPermission('users_create');
        state.canEdit = checkPermission('users_edit');
        state.canDelete = checkPermission('users_delete');
        state.canExport = checkPermission('users_export');

        if (dom.addUserBtn) dom.addUserBtn.style.display = state.canCreate ? 'inline-flex' : 'none';
        if (dom.exportExcelBtn) dom.exportExcelBtn.style.display = state.canExport ? 'inline-flex' : 'none';
        if (dom.exportPdfBtn) dom.exportPdfBtn.style.display = state.canExport ? 'inline-flex' : 'none';
        if (dom.printBtn) dom.printBtn.style.display = state.canExport ? 'inline-flex' : 'none';
    }

    // ============================================================
    // UTILITIES (delegated to utils.js)
    // ============================================================
    function notify(type, message) {
        if (typeof showToast === 'function') {
            showToast(message, type, CONFIG.TOAST_DURATION_MS);
            return;
        }
        if (window.SoufStock && typeof window.SoufStock.showToast === 'function') {
            window.SoufStock.showToast(message, type, CONFIG.TOAST_DURATION_MS);
            return;
        }
        // Fallback inline
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        var iconSvg = '';
        if (type === 'success') iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        else if (type === 'error') iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
        else if (type === 'warning') iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
        else iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
        toast.innerHTML = iconSvg + '<span>' + message + '</span>';
        dom.toastContainer.appendChild(toast);
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, CONFIG.TOAST_DURATION_MS);
    }

    function debounced(fn, delay) {
        if (typeof debounce === 'function') {
            return debounce(fn, delay);
        }
        var timer;
        return function() {
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function() { fn.apply(null, args); }, delay);
        };
    }

    function fmtDateTime(iso) {
        if (typeof formatDateTime === 'function') {
            return formatDateTime(iso);
        }
        if (!iso) return '-';
        return new Date(iso).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function getInitials(u) {
        return ((u.prenom || '') + (u.nom || '')).substring(0, 2).toUpperCase() || (u.username || 'U').substring(0, 2).toUpperCase();
    }

    function getDisplayName(u) {
        return u.nom_complet || ((u.prenom || '') + ' ' + (u.nom || '')).trim() || u.username || 'Inconnu';
    }

    function getRoleName(u) {
        return (u.roles && u.roles.nom) ? u.roles.nom : '-';
    }

    function getLangLabel(lang) {
        return { fr: 'Francais', en: 'Anglais', ar: 'Arabe' }[lang] || (lang || '-');
    }

    function getThemeLabel(theme) {
        return { light: 'Clair', dark: 'Sombre' }[theme] || (theme || '-');
    }

    // ============================================================
    // LOAD DATA
    // ============================================================
    async function loadStatistics() {
        var client = getClient();
        if (!client) return;
        try {
            var totalResult = await client.from(CONFIG.TABLE).select('*', { count: 'exact', head: true });
            var activeResult = await client.from(CONFIG.TABLE).select('*', { count: 'exact', head: true }).eq('actif', true);
            var inactiveResult = await client.from(CONFIG.TABLE).select('*', { count: 'exact', head: true }).eq('actif', false);
            var adminRole = state.roles.find(function(r) { return r.nom && r.nom.toLowerCase().includes('admin'); });
            var adminResult = adminRole ? await client.from(CONFIG.TABLE).select('*', { count: 'exact', head: true }).eq('role_id', adminRole.id) : { count: 0 };
            var servicesResult = await client.from(CONFIG.TABLE).select('service').not('service', 'is', null);
            var uniqueServices = [];
            if (servicesResult.data) {
                servicesResult.data.forEach(function(u) {
                    if (u.service && uniqueServices.indexOf(u.service) === -1) uniqueServices.push(u.service);
                });
            }

            if (dom.statTotal) dom.statTotal.textContent = totalResult.count || 0;
            if (dom.statActive) dom.statActive.textContent = activeResult.count || 0;
            if (dom.statInactive) dom.statInactive.textContent = inactiveResult.count || 0;
            if (dom.statAdmins) dom.statAdmins.textContent = adminResult.count || 0;
            if (dom.statServices) dom.statServices.textContent = uniqueServices.length;
        } catch (e) { console.error('Load statistics error:', e); }
    }

    async function loadRoles() {
        var client = getClient();
        if (!client) return;
        try {
            var result = await client.from(CONFIG.ROLES_TABLE).select('id, nom').order('nom');
            if (!result.error && result.data) {
                state.roles = result.data;
                var roleOptions = '<option value="">Tous les roles</option>' + state.roles.map(function(r) {
                    return '<option value="' + r.id + '">' + r.nom + '</option>';
                }).join('');
                var roleSelectOptions = '<option value="">Selectionner...</option>' + state.roles.map(function(r) {
                    return '<option value="' + r.id + '">' + r.nom + '</option>';
                }).join('');
                if (dom.roleFilterSelect) dom.roleFilterSelect.innerHTML = roleOptions;
                if (dom.userRole) dom.userRole.innerHTML = roleSelectOptions;
            }
        } catch (e) { console.error('Load roles error:', e); }
    }

    async function loadServiceFilter() {
        var client = getClient();
        if (!client) return;
        try {
            var result = await client.from(CONFIG.TABLE).select('service').not('service', 'is', null);
            var services = [];
            if (result.data) {
                result.data.forEach(function(u) {
                    if (u.service && services.indexOf(u.service) === -1) services.push(u.service);
                });
            }
            services.sort();
            if (dom.serviceFilterSelect) {
                dom.serviceFilterSelect.innerHTML = '<option value="">Tous les services</option>' + services.map(function(s) {
                    return '<option value="' + s + '">' + s + '</option>';
                }).join('');
            }
        } catch (e) { console.error('Load services error:', e); }
    }

    async function loadUsers() {
        var client = getClient();
        if (!client) return;
        dom.usersTableBody.innerHTML = '<tr><td colspan="18" class="table-loader"><div class="spinner"></div><p>Chargement des utilisateurs...</p></td></tr>';

        try {
            var query = client.from(CONFIG.TABLE)
                .select('id, username, email, nom, prenom, nom_complet, matricule, role_id, service, poste, telephone, photo, langue, theme, actif, dernier_login, created_at, updated_at, roles(nom)', { count: 'exact' });

            if (state.searchQuery) {
                query = query.or('nom.ilike.%' + state.searchQuery + '%,prenom.ilike.%' + state.searchQuery + '%,username.ilike.%' + state.searchQuery + '%,email.ilike.%' + state.searchQuery + '%,matricule.ilike.%' + state.searchQuery + '%,nom_complet.ilike.%' + state.searchQuery + '%');
            }
            if (state.roleFilter) query = query.eq('role_id', state.roleFilter);
            if (state.serviceFilter) query = query.eq('service', state.serviceFilter);
            if (state.statusFilter) query = query.eq('actif', state.statusFilter === 'true');
            if (state.langFilter) query = query.eq('langue', state.langFilter);
            if (state.themeFilter) query = query.eq('theme', state.themeFilter);

            var from = (state.currentPage - 1) * state.pageSize;
            var to = from + state.pageSize - 1;

            var result = await query.order(state.sortColumn, { ascending: state.sortDirection === 'asc' }).range(from, to);

            if (result.error) throw result.error;

            state.users = result.data || [];
            state.totalCount = result.count || 0;

            renderTable();
            renderPagination();
            loadStatistics();
        } catch (e) {
            console.error('Load users error:', e);
            dom.usersTableBody.innerHTML = '<tr><td colspan="18" class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><h4>Erreur de chargement</h4><p>Impossible de charger les utilisateurs. Veuillez reessayer.</p></td></tr>';
        }
    }

    // ============================================================
    // CRUD
    // ============================================================
    function openViewUser(userId) {
        var user = state.users.find(function(u) { return u.id === userId; });
        if (!user) return;

        var initials = getInitials(user);
        var displayName = getDisplayName(user);
        var roleName = getRoleName(user);
        var langLabel = getLangLabel(user.langue);
        var themeLabel = getThemeLabel(user.theme);
        var statusLabel = user.actif ? 'Actif' : 'Inactif';
        var statusClass = user.actif ? 'badge-success' : 'badge-danger';

        var avatarHtml = user.photo ? '<img src="' + user.photo + '" alt="" onerror="this.style.display=\'none\';this.parentNode.textContent=\'' + initials + '\'">' : initials;
        dom.viewAvatar.innerHTML = avatarHtml;
        dom.viewName.textContent = displayName;
        dom.viewRole.innerHTML = '<span class="badge ' + statusClass + '">' + statusLabel + '</span> <span class="badge badge-info">' + roleName + '</span>';

        var createdAt = fmtDateTime(user.created_at);
        var updatedAt = fmtDateTime(user.updated_at);
        var lastLogin = user.dernier_login ? new Date(user.dernier_login).toLocaleString('fr-FR') : 'Jamais';

        dom.viewGrid.innerHTML =
            '<div class="view-item"><div class="view-label">Nom</div><div class="view-value">' + (user.nom || '-') + '</div></div>' +
            '<div class="view-item"><div class="view-label">Prenom</div><div class="view-value">' + (user.prenom || '-') + '</div></div>' +
            '<div class="view-item"><div class="view-label">Nom Complet</div><div class="view-value">' + displayName + '</div></div>' +
            '<div class="view-item"><div class="view-label">Username</div><div class="view-value">' + (user.username || '-') + '</div></div>' +
            '<div class="view-item full"><div class="view-label">Email</div><div class="view-value">' + (user.email || '-') + '</div></div>' +
            '<div class="view-item"><div class="view-label">Telephone</div><div class="view-value">' + (user.telephone || '-') + '</div></div>' +
            '<div class="view-item"><div class="view-label">Matricule</div><div class="view-value">' + (user.matricule || '-') + '</div></div>' +
            '<div class="view-item"><div class="view-label">Service</div><div class="view-value">' + (user.service || '-') + '</div></div>' +
            '<div class="view-item"><div class="view-label">Poste</div><div class="view-value">' + (user.poste || '-') + '</div></div>' +
            '<div class="view-item"><div class="view-label">Langue</div><div class="view-value">' + langLabel + '</div></div>' +
            '<div class="view-item"><div class="view-label">Theme</div><div class="view-value">' + themeLabel + '</div></div>' +
            '<div class="view-item"><div class="view-label">Cree le</div><div class="view-value">' + createdAt + '</div></div>' +
            '<div class="view-item"><div class="view-label">Modifie le</div><div class="view-value">' + updatedAt + '</div></div>' +
            '<div class="view-item full"><div class="view-label">Derniere Connexion</div><div class="view-value">' + lastLogin + '</div></div>';

        dom.viewModal.classList.add('active');
    }

    function openAddUser() {
        state.selectedUserId = null;
        dom.modalTitle.textContent = 'Nouvel Utilisateur';
        dom.userForm.reset();
        dom.userId.value = '';
        dom.userNomComplet.value = '';
        dom.userActif.checked = true;
        clearFormErrors();
        dom.userModal.classList.add('active');
    }

    function openEditUser(userId) {
        var user = state.users.find(function(u) { return u.id === userId; });
        if (!user) return;
        state.selectedUserId = userId;
        dom.modalTitle.textContent = 'Modifier Utilisateur';
        dom.userId.value = userId;
        dom.userNom.value = user.nom || '';
        dom.userPrenom.value = user.prenom || '';
        dom.userNomComplet.value = user.nom_complet || '';
        dom.userUsername.value = user.username || '';
        dom.userEmail.value = user.email || '';
        dom.userMatricule.value = user.matricule || '';
        dom.userTelephone.value = user.telephone || '';
        dom.userRole.value = user.role_id || '';
        dom.userService.value = user.service || '';
        dom.userPoste.value = user.poste || '';
        dom.userLangue.value = user.langue || 'fr';
        dom.userTheme.value = user.theme || 'light';
        dom.userPhoto.value = user.photo || '';
        dom.userActif.checked = user.actif !== false;
        clearFormErrors();
        dom.userModal.classList.add('active');
    }

    function openDeleteUser(userId) {
        var user = state.users.find(function(u) { return u.id === userId; });
        if (!user) return;
        state.deleteUserId = userId;
        var displayName = getDisplayName(user);
        dom.deleteUserName.textContent = displayName;
        dom.deleteUserEmail.textContent = user.email || "Pas d'email";
        dom.deleteModal.classList.add('active');
    }

    function clearFormErrors() {
        document.querySelectorAll('.form-error').forEach(function(el) { el.classList.remove('visible'); });
        document.querySelectorAll('.form-group').forEach(function(el) { el.classList.remove('has-error'); });
    }

    function validateForm() {
        var valid = true;
        clearFormErrors();

        var nom = dom.userNom.value.trim();
        var prenom = dom.userPrenom.value.trim();
        var username = dom.userUsername.value.trim();
        var email = dom.userEmail.value.trim();
        var role = dom.userRole.value;

        if (!nom) { document.getElementById('errorNom').classList.add('visible'); dom.userNom.closest('.form-group').classList.add('has-error'); valid = false; }
        if (!prenom) { document.getElementById('errorPrenom').classList.add('visible'); dom.userPrenom.closest('.form-group').classList.add('has-error'); valid = false; }
        if (!username) { document.getElementById('errorUsername').classList.add('visible'); dom.userUsername.closest('.form-group').classList.add('has-error'); valid = false; }
        if (!email || !email.includes('@')) { document.getElementById('errorEmail').classList.add('visible'); dom.userEmail.closest('.form-group').classList.add('has-error'); valid = false; }
        if (!role) { document.getElementById('errorRole').classList.add('visible'); dom.userRole.closest('.form-group').classList.add('has-error'); valid = false; }

        return valid;
    }

    function updateNomComplet() {
        var nom = dom.userNom.value.trim();
        var prenom = dom.userPrenom.value.trim();
        if (nom || prenom) {
            dom.userNomComplet.value = (prenom + ' ' + nom).trim();
        }
    }

    async function saveUser() {
        var client = getClient();
        if (!client) return;
        if (!validateForm()) return;

        var data = {
            nom: dom.userNom.value.trim(),
            prenom: dom.userPrenom.value.trim(),
            nom_complet: dom.userNomComplet.value.trim() || (dom.userPrenom.value.trim() + ' ' + dom.userNom.value.trim()).trim(),
            username: dom.userUsername.value.trim(),
            email: dom.userEmail.value.trim(),
            matricule: dom.userMatricule.value.trim() || null,
            telephone: dom.userTelephone.value.trim() || null,
            role_id: parseInt(dom.userRole.value) || null,
            service: dom.userService.value.trim() || null,
            poste: dom.userPoste.value.trim() || null,
            langue: dom.userLangue.value,
            theme: dom.userTheme.value,
            photo: dom.userPhoto.value.trim() || null,
            actif: dom.userActif.checked,
            updated_at: new Date().toISOString()
        };

        try {
            if (state.selectedUserId) {
                var result = await client.from(CONFIG.TABLE).update(data).eq('id', state.selectedUserId).select();
                if (result.error) throw result.error;
                notify('success', 'Utilisateur modifie avec succes');
            } else {
                data.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
                data.created_at = new Date().toISOString();
                var result = await client.from(CONFIG.TABLE).insert([data]).select();
                if (result.error) throw result.error;
                notify('success', 'Utilisateur cree avec succes');
            }
            closeModal();
            loadUsers();
            loadServiceFilter();
        } catch (e) {
            console.error('Save user error:', e);
            notify('error', 'Erreur: ' + (e.message || 'Impossible de sauvegarder'));
        }
    }

    async function confirmDeleteUser() {
        var client = getClient();
        if (!client || !state.deleteUserId) return;
        try {
            var result = await client.from(CONFIG.TABLE).delete().eq('id', state.deleteUserId);
            if (result.error) throw result.error;
            notify('success', 'Utilisateur supprime avec succes');
            closeDeleteModal();
            loadUsers();
            loadServiceFilter();
        } catch (e) {
            console.error('Delete user error:', e);
            notify('error', 'Erreur: ' + (e.message || 'Impossible de supprimer'));
        }
    }

    function closeModal() {
        dom.userModal.classList.remove('active');
        state.selectedUserId = null;
    }
    function closeViewModal() {
        dom.viewModal.classList.remove('active');
    }
    function closeDeleteModal() {
        dom.deleteModal.classList.remove('active');
        state.deleteUserId = null;
    }

    // ============================================================
    // SEARCH
    // ============================================================
    function onSearchInput() {
        state.searchQuery = dom.searchInput.value.trim();
        state.currentPage = 1;
        loadUsers();
    }

    // ============================================================
    // PAGINATION
    // ============================================================
    function renderPagination() {
        var totalPages = Math.ceil(state.totalCount / state.pageSize) || 1;
        var start = (state.currentPage - 1) * state.pageSize + 1;
        var end = Math.min(state.currentPage * state.pageSize, state.totalCount);
        dom.paginationInfo.textContent = state.totalCount > 0 ? 'Affichage ' + start + '-' + end + ' sur ' + state.totalCount + ' utilisateurs' : 'Aucun utilisateur';

        var pages = [];
        var maxButtons = 5;
        var startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
        var endPage = Math.min(totalPages, startPage + maxButtons - 1);
        if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

        pages.push('<button class="page-btn" data-page="' + (state.currentPage - 1) + '" ' + (state.currentPage === 1 ? 'disabled' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>');
        for (var i = startPage; i <= endPage; i++) {
            pages.push('<button class="page-btn ' + (i === state.currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>');
        }
        pages.push('<button class="page-btn" data-page="' + (state.currentPage + 1) + '" ' + (state.currentPage === totalPages ? 'disabled' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>');

        dom.paginationControls.innerHTML = pages.join('');
        attachPaginationListeners();
    }

    function attachPaginationListeners() {
        dom.paginationControls.querySelectorAll('.page-btn').forEach(function(btn) {
            btn.addEventListener('click', onPageBtnClick);
        });
    }

    function onPageBtnClick() {
        var page = parseInt(this.getAttribute('data-page'));
        var totalPages = Math.ceil(state.totalCount / state.pageSize) || 1;
        if (page < 1 || page > totalPages) return;
        state.currentPage = page;
        loadUsers();
    }

    // ============================================================
    // SORTING
    // ============================================================
    function onSortClick() {
        var col = this.getAttribute('data-col');
        if (!col) return;
        if (state.sortColumn === col) state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        else { state.sortColumn = col; state.sortDirection = 'asc'; }
        loadUsers();
    }

    // ============================================================
    // RENDER TABLE
    // ============================================================
    function renderTable() {
        if (state.users.length === 0) {
            dom.usersTableBody.innerHTML = '<tr><td colspan="18" class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><h4>Aucun utilisateur</h4><p>Aucun utilisateur ne correspond a vos criteres de recherche.</p></td></tr>';
            return;
        }

        dom.usersTableBody.innerHTML = state.users.map(function(u) {
            var initials = getInitials(u);
            var displayName = getDisplayName(u);
            var roleName = getRoleName(u);
            var statusBadge = u.actif ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>';
            var createdAt = fmtDateTime(u.created_at);
            var updatedAt = fmtDateTime(u.updated_at);
            var langLabel = getLangLabel(u.langue);
            var themeLabel = getThemeLabel(u.theme);
            var photoHtml = u.photo ? '<img src="' + u.photo + '" alt="" onerror="this.style.display=\'none\';this.parentNode.textContent=\'' + initials + '\'">' : initials;
            var isSelected = state.selectedRows.has(u.id) ? 'selected' : '';

            var actionsHtml = '<button class="action-btn view" data-action="view" data-id="' + u.id + '" title="Voir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
            if (state.canEdit) actionsHtml += '<button class="action-btn edit" data-action="edit" data-id="' + u.id + '" title="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
            if (state.canDelete) actionsHtml += '<button class="action-btn delete" data-action="delete" data-id="' + u.id + '" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';

            return '<tr class="' + isSelected + '" data-id="' + u.id + '">' +
                '<td><input type="checkbox" class="row-check" data-id="' + u.id + '" ' + (state.selectedRows.has(u.id) ? 'checked' : '') + '></td>' +
                '<td><div class="user-avatar">' + photoHtml + '</div></td>' +
                '<td>' + (u.matricule || '-') + '</td>' +
                '<td><span class="user-name">' + (u.nom || '-') + '</span></td>' +
                '<td>' + (u.prenom || '-') + '</td>' +
                '<td>' + displayName + '</td>' +
                '<td>' + (u.username || '-') + '</td>' +
                '<td>' + (u.email || '-') + '</td>' +
                '<td>' + (u.telephone || '-') + '</td>' +
                '<td>' + (u.service || '-') + '</td>' +
                '<td>' + (u.poste || '-') + '</td>' +
                '<td><span class="badge badge-info">' + roleName + '</span></td>' +
                '<td><span class="badge badge-secondary">' + langLabel + '</span></td>' +
                '<td><span class="badge badge-secondary">' + themeLabel + '</span></td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + createdAt + '</td>' +
                '<td>' + updatedAt + '</td>' +
                '<td><div class="actions">' + actionsHtml + '</div></td>' +
                '</tr>';
        }).join('');

        attachTableListeners();
    }

    function attachTableListeners() {
        document.querySelectorAll('.row-check').forEach(function(cb) {
            cb.addEventListener('change', onRowCheckChange);
        });
        dom.usersTableBody.addEventListener('click', onTableActionClick);
    }

    function onRowCheckChange() {
        var id = this.getAttribute('data-id');
        if (this.checked) state.selectedRows.add(id);
        else state.selectedRows.delete(id);
        var row = this.closest('tr');
        if (this.checked) row.classList.add('selected');
        else row.classList.remove('selected');
    }

    function onTableActionClick(e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');
        if (action === 'view') openViewUser(id);
        else if (action === 'edit') openEditUser(id);
        else if (action === 'delete') openDeleteUser(id);
    }

    // ============================================================
    // EXPORT
    // ============================================================
    function exportToExcel() {
        var headers = ['Matricule', 'Nom', 'Prenom', 'Nom Complet', 'Username', 'Email', 'Telephone', 'Service', 'Poste', 'Role', 'Langue', 'Theme', 'Actif', 'Cree le', 'Modifie le'];
        var rows = state.users.map(function(u) {
            var roleName = getRoleName(u);
            return [
                u.matricule || '', u.nom || '', u.prenom || '', u.nom_complet || '', u.username || '', u.email || '',
                u.telephone || '', u.service || '', u.poste || '', roleName, u.langue || '', u.theme || '',
                u.actif ? 'Oui' : 'Non', u.created_at || '', u.updated_at || ''
            ];
        });

        var csvContent = '\uFEFF' + headers.join(';') + '\n';
        rows.forEach(function(row) {
            csvContent += row.join(';') + '\n';
        });

        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'utilisateurs_' + new Date().toISOString().slice(0, 10) + '.csv';
        link.click();
        notify('success', 'Export Excel termine');
    }

    function exportToPDF() {
        var printWindow = window.open('', '_blank');
        var html = '<html><head><title>Utilisateurs - SoufStock ERP</title>';
        html += '<style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#0B7A3B;color:#fff}tr:nth-child(even){background:#f9f9f9}</style>';
        html += '</head><body><h2>Liste des Utilisateurs - SoufStock ERP</h2><p>Genere le: ' + new Date().toLocaleString('fr-FR') + '</p>';
        html += '<table><thead><tr><th>Matricule</th><th>Nom</th><th>Prenom</th><th>Email</th><th>Telephone</th><th>Service</th><th>Poste</th><th>Role</th><th>Actif</th></tr></thead><tbody>';
        state.users.forEach(function(u) {
            var roleName = getRoleName(u);
            html += '<tr><td>' + (u.matricule || '-') + '</td><td>' + (u.nom || '-') + '</td><td>' + (u.prenom || '-') + '</td><td>' + (u.email || '-') + '</td><td>' + (u.telephone || '-') + '</td><td>' + (u.service || '-') + '</td><td>' + (u.poste || '-') + '</td><td>' + roleName + '</td><td>' + (u.actif ? 'Oui' : 'Non') + '</td></tr>';
        });
        html += '</tbody></table></body></html>';
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        notify('success', 'Impression PDF lancee');
    }

    function printTable() {
        exportToPDF();
    }

    // ============================================================
    // EVENTS
    // ============================================================
    function bindEvents() {
        dom.addUserBtn.addEventListener('click', openAddUser);
        dom.modalClose.addEventListener('click', closeModal);
        dom.modalCancel.addEventListener('click', closeModal);
        dom.modalSave.addEventListener('click', function(e) { e.preventDefault(); saveUser(); });
        dom.viewModalClose.addEventListener('click', closeViewModal);
        dom.viewModalCloseBtn.addEventListener('click', closeViewModal);
        dom.deleteModalClose.addEventListener('click', closeDeleteModal);
        dom.deleteCancel.addEventListener('click', closeDeleteModal);
        dom.deleteConfirm.addEventListener('click', confirmDeleteUser);

        dom.exportExcelBtn.addEventListener('click', exportToExcel);
        dom.exportPdfBtn.addEventListener('click', exportToPDF);
        dom.printBtn.addEventListener('click', printTable);

        dom.userModal.addEventListener('click', function(e) { if (e.target === dom.userModal) closeModal(); });
        dom.viewModal.addEventListener('click', function(e) { if (e.target === dom.viewModal) closeViewModal(); });
        dom.deleteModal.addEventListener('click', function(e) { if (e.target === dom.deleteModal) closeDeleteModal(); });

        dom.searchInput.addEventListener('input', debounced(onSearchInput, CONFIG.SEARCH_DEBOUNCE_MS));

        dom.roleFilterSelect.addEventListener('change', function() { state.roleFilter = this.value; state.currentPage = 1; loadUsers(); });
        dom.serviceFilterSelect.addEventListener('change', function() { state.serviceFilter = this.value; state.currentPage = 1; loadUsers(); });
        dom.statusFilterSelect.addEventListener('change', function() { state.statusFilter = this.value; state.currentPage = 1; loadUsers(); });
        dom.langFilterSelect.addEventListener('change', function() { state.langFilter = this.value; state.currentPage = 1; loadUsers(); });
        dom.themeFilterSelect.addEventListener('change', function() { state.themeFilter = this.value; state.currentPage = 1; loadUsers(); });

        dom.pageSizeSelect.addEventListener('change', function() { state.pageSize = parseInt(this.value); state.currentPage = 1; loadUsers(); });

        dom.refreshBtn.addEventListener('click', function() { loadUsers(); loadServiceFilter(); notify('success', 'Donnees actualisees'); });

        dom.selectAll.addEventListener('change', function() {
            var isChecked = this.checked;
            document.querySelectorAll('.row-check').forEach(function(cb) {
                cb.checked = isChecked;
                var id = cb.getAttribute('data-id');
                var row = cb.closest('tr');
                if (isChecked) { state.selectedRows.add(id); row.classList.add('selected'); }
                else { state.selectedRows.delete(id); row.classList.remove('selected'); }
            });
        });

        document.querySelectorAll('#usersTable thead th.sortable').forEach(function(th) {
            th.addEventListener('click', onSortClick);
        });

        dom.userNom.addEventListener('input', updateNomComplet);
        dom.userPrenom.addEventListener('input', updateNomComplet);

        document.addEventListener('keydown', onKeyDown);
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            closeModal();
            closeViewModal();
            closeDeleteModal();
        }
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            dom.searchInput.focus();
        }
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        cacheDOM();

        initAuth().then(function(ok) {
            if (ok) {
                loadCurrentUserProfile().then(function() {
                    updateUIBasedOnPermissions();
                    loadRoles().then(function() {
                        loadServiceFilter();
                        loadUsers();
                    });
                });
            }
        });

        bindEvents();
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();