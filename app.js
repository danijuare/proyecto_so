/**
 * Portal Académico SO & Ciberseguridad - Lógica de Sesiones, Roles y Notificaciones
 * Con Protecciones: XSS, JWT, Validación de Entrada
 */

const API_URL = 'http://localhost:3000/api';

// Función para escapar HTML y prevenir XSS
function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Detectar caracteres o palabras peligrosas en inputs (cliente)
function containsDangerousInput(value) {
    if (!value || typeof value !== 'string') return false;
    const dangerousChars = ['<', '>', '"', "'", '&', ';', '(', ')', '{', '}', '|', '\\', '^', '`', '$'];
    for (let ch of dangerousChars) {
        if (value.includes(ch)) return true;
    }
    const keywords = ['script', 'alert', 'onclick', 'onerror', 'onload', 'javascript:', 'data:', 'vbscript:', 'iframe', 'img', 'svg'];
    const lower = value.toLowerCase();
    for (let kw of keywords) {
        if (lower.includes(kw)) return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    // Determinar la página actual
    const bodyClass = document.body.className;
    
    // Guardianes de Autenticación y Carga de Componentes
    if (bodyClass !== 'page-login') {
        checkSession();
        setupLogout();
        setupNavbar();
        
        // Gating para la página de Administración
        if (bodyClass === 'page-admin') {
            const userRole = sessionStorage.getItem('userRole');
            if (userRole !== 'Admin') {
                // Prevenir acceso a no administradores
                showToast('Acceso Denegado', 'No tienes permisos para ingresar al panel de administración.', 'error');
                setTimeout(() => {
                    window.location.href = 'os.html';
                }, 1500);
                return;
            }
            initAdminPage();
        }
    } else {
        initLoginPage();
    }
});

/* --- GESTIÓN DE SESIÓN --- */
function checkSession() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn || isLoggedIn !== 'true') {
        // No está logueado, redirigir al login
        window.location.href = 'index.html';
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userRole');
            showToast('Sesión Cerrada', 'Has cerrado tu sesión correctamente.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }
}

/* --- RENDERIZADO DINÁMICO DE NAVBAR POR ROL --- */
function setupNavbar() {
    const navLinks = document.querySelector('.nav-links');
    const userRole = sessionStorage.getItem('userRole');
    
    if (navLinks && userRole === 'Admin') {
        // Si el usuario es Admin y no existe la pestaña administración, inyectarla dinámicamente
        const adminLinkExists = document.getElementById('nav-admin');
        if (!adminLinkExists) {
            const adminLi = document.createElement('li');
            const isActive = document.body.className === 'page-admin' ? 'active' : '';
            
            adminLi.innerHTML = `
                <a href="admin.html" class="nav-link ${isActive}" id="nav-admin" ${isActive ? 'aria-current="page"' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Administración
                </a>
            `;
            // Insertar antes del botón de logout (último elemento li)
            navLinks.insertBefore(adminLi, navLinks.lastElementChild);
        }
    }
}

/* --- SISTEMA DE NOTIFICACIONES TOAST --- */
function showToast(title, message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Sanitizar datos para prevenir XSS
    const titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = title; // Usar textContent en lugar de innerHTML
    
    const msgEl = document.createElement('div');
    msgEl.className = 'toast-msg';
    msgEl.textContent = message; // Usar textContent en lugar de innerHTML
    
    toast.appendChild(titleEl);
    toast.appendChild(msgEl);
    
    container.appendChild(toast);
    
    // Desvanecer y remover el toast después de 3.5 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px) scale(0.9)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

/* --- LOGICA DE INICIO DE SESIÓN (API) --- */
function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        //console.log("email ", email);
        //console.log("password ", password);
        
        // Validaciones básicas del lado del cliente
        if (!email || !password) {
            showToast('Campos vacíos', 'Por favor, ingresa tu correo y contraseña.', 'error');
            return;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Formato inválido', 'Por favor, ingresa un correo electrónico válido.', 'error');
            return;
        }
        // Bloquear inputs con caracteres o palabras peligrosas
        if (containsDangerousInput(email)) {
            showToast('Entrada peligrosa', 'El correo contiene caracteres o contenido no permitido.', 'error');
            return;
        }
        
        // Validar longitud de contraseña
        if (password.length < 6 || password.length > 100) {
            showToast('Contraseña inválida', 'La contraseña debe tener entre 6 y 100 caracteres.', 'error');
            return;
        }
        
        try {
            // Petición de login al servidor Express
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showToast('Error de Acceso', data.message || 'Credenciales incorrectas.', 'error');
                return;
            }

            // Inicio de sesión exitoso - Guardar JWT token
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('userEmail', escapeHTML(data.user.email));
            sessionStorage.setItem('userRole', data.user.rol);
            
            showToast('¡Bienvenido!', 'Autenticado con éxito.', 'success');
            
            // Redirigir a la página de Sistemas Operativos después de 1.5 segundos
            setTimeout(() => {
                window.location.href = 'os.html';
            }, 1500);

        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Error de Servidor', 'No se pudo conectar con el servidor.', 'error');
        }
    });
}

/* --- LOGICA DE PANEL DE ADMINISTRACIÓN (API) --- */
function initAdminPage() {
    const adminTableBody = document.getElementById('admin-table-body');
    const adminCreateForm = document.getElementById('admin-create-form');
    
    // 1. Cargar lista de usuarios desde la base de datos
    fetchUsers();

    async function fetchUsers() {
        try {
            const token = sessionStorage.getItem('authToken');
            if (!token) {
                showToast('Error', 'Token de autenticación no disponible.', 'error');
                return;
            }
            
            const response = await fetch(`${API_URL}/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                showToast('Error', data.message || 'Error al obtener usuarios.', 'error');
                return;
            }

            // Limpiar tabla
            adminTableBody.innerHTML = '';

            if (data.users.length === 0) {
                const emptyRow = document.createElement('tr');
                const emptyCell = document.createElement('td');
                emptyCell.colSpan = '4';
                emptyCell.style.textAlign = 'center';
                emptyCell.style.color = 'var(--text-muted)';
                emptyCell.textContent = 'No hay usuarios registrados.';
                emptyRow.appendChild(emptyCell);
                adminTableBody.appendChild(emptyRow);
                return;
            }

            // Llenar tabla con datos sanitizados
            data.users.forEach(user => {
                const tr = document.createElement('tr');
                const fecha = new Date(user.fecha_creacion).toLocaleString('es-GT', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const idCell = document.createElement('td');
                idCell.innerHTML = `<strong>${user.id}</strong>`;
                
                const emailCell = document.createElement('td');
                emailCell.textContent = user.email; // Ya sanitizado en backend
                
                const rolBadge = document.createElement('span');
                rolBadge.className = `role-badge ${user.rol}`;
                rolBadge.textContent = user.rol;
                const rolCell = document.createElement('td');
                rolCell.appendChild(rolBadge);
                
                const fechaCell = document.createElement('td');
                fechaCell.style.color = 'var(--text-secondary)';
                fechaCell.textContent = fecha;

                tr.appendChild(idCell);
                tr.appendChild(emailCell);
                tr.appendChild(rolCell);
                tr.appendChild(fechaCell);
                
                adminTableBody.appendChild(tr);
            });

        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Error de Conexión', 'No se pudieron recuperar los usuarios.', 'error');
        }
    }

    // 2. Registrar nuevo usuario
    if (adminCreateForm) {
        adminCreateForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('admin-email').value.trim();
            const password = document.getElementById('admin-password').value;
            const rol = document.getElementById('admin-role').value;

            // Validaciones básicas
            if (!email || !password || !rol) {
                showToast('Campos vacíos', 'Por favor completa todos los datos.', 'error');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showToast('Formato de correo', 'Por favor ingresa un correo válido.', 'error');
                return;
            }
            // Bloquear inputs peligrosos en creación de usuarios
            if (containsDangerousInput(email)) {
                showToast('Entrada peligrosa', 'El correo contiene caracteres o contenido no permitido.', 'error');
                return;
            }

            if (password.length < 6 || password.length > 100) {
                showToast('Contraseña inválida', 'La contraseña debe tener entre 6 y 100 caracteres.', 'error');
                return;
            }

            if (!['Normal', 'Admin'].includes(rol)) {
                showToast('Rol inválido', 'Por favor selecciona un rol válido.', 'error');
                return;
            }

            try {
                const token = sessionStorage.getItem('authToken');
                if (!token) {
                    showToast('Error', 'Token no disponible.', 'error');
                    return;
                }
                
                const response = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ email, password, rol })
                });

                const data = await response.json();

                if (!response.ok) {
                    showToast('Error de registro', data.message || 'No se pudo crear el usuario.', 'error');
                    return;
                }

                showToast('Registro Exitoso', data.message, 'success');
                
                // Limpiar formulario y recargar tabla
                adminCreateForm.reset();
                fetchUsers();

            } catch (error) {
                console.error('Error creating user:', error);
                showToast('Error de registro', 'No se pudo completar el registro por falla del servidor.', 'error');
            }
        });
    }
}

// Sanitizar entradas para evitar XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
