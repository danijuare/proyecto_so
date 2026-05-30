<?php
// Evitar que el navegador guarde en caché la página protegida
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Nota: El verdadero guardián sigue siendo JavaScript con el JWT, 
// pero ocultamos el HTML por defecto usando CSS/JS síncrono para que no pinte nada.
?>
<!DOCTYPE html>
<html lang="es" style="display: none;"> <head>
    <meta charset="UTF-8">
    <title>Administración de Usuarios</title>
    <link rel="stylesheet" href="style.css">
    
    <script>
        if (sessionStorage.getItem('isLoggedIn') !== 'true') {
            // Si no está logueado, redirige de inmediato y no muestra nada
            window.location.replace('index.php');
        } else {
            // Si sí está logueado, volvemos a hacer visible la página
            document.documentElement.style.display = 'block';
        }
    </script>
</head>
<body class="page-admin">

    <script>
        if (sessionStorage.getItem('isLoggedIn') !== 'true' || sessionStorage.getItem('userRole') !== 'Admin') {
            window.location.replace('index.php');
        }
    </script>

    <nav class="navbar" aria-label="Navegación Principal">
        <div class="nav-brand">
            PortalOS <span>| Académico</span>
        </div>
        <ul class="nav-links">
            <li>
                <a href="os.php" class="nav-link" id="nav-os">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    Sistemas Operativos
                </a>
            </li>
            <li>
                <a href="security.php" class="nav-link" id="nav-security">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    Ciberseguridad
                </a>
            </li>
            <li>
                <a href="admin.php" class="nav-link active" id="nav-admin" aria-current="page">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Administración
                </a>
            </li>
            <li>
                <button class="btn-logout" id="btn-logout" aria-label="Cerrar Sesión">
                    Cerrar Sesión
                </button>
            </li>
        </ul>
    </nav>

    <main class="container">
        <header style="margin-bottom: 1rem;">
            <h1 style="font-size: 2.75rem; font-weight: 800; background: linear-gradient(to right, #fff, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                Panel de Administración
            </h1>
            <p style="color: var(--text-secondary); font-size: 1.1rem; margin-top: 0.5rem; font-weight: 300;">
                Administración de cuentas y asignación de roles del sistema.
            </p>
        </header>

        <div style="display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 3rem; align-items: start; margin-top: -2rem;">
            
            <section aria-labelledby="form-heading">
                <div class="glass-card">
                    <h2 id="form-heading" style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: white; display: flex; align-items: center; gap: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        Registrar Usuario
                    </h2>
                    <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 2rem;">
                        Agrega un nuevo usuario y asígnale un rol de acceso.
                    </p>

                    <form id="admin-create-form" novalidate>
                        <div class="form-group">
                            <label for="admin-email">Correo Electrónico</label>
                            <div class="input-wrapper">
                                <span class="input-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                </span>
                                <input type="email" id="admin-email" class="form-input" style="font-size: 0.95rem; padding: 0.75rem 1rem 0.75rem 3rem;" placeholder="ejemplo@umg.edu.gt" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="admin-password">Contraseña</label>
                            <div class="input-wrapper">
                                <span class="input-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </span>
                                <input type="password" id="admin-password" class="form-input" style="font-size: 0.95rem; padding: 0.75rem 1rem 0.75rem 3rem;" placeholder="••••••••" required>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="admin-role">Rol de Acceso</label>
                            <div class="input-wrapper">
                                <span class="input-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                </span>
                                <select id="admin-role" class="form-input" style="font-size: 0.95rem; padding: 0.75rem 1rem 0.75rem 3rem;" required>
                                    <option value="Normal">Normal (Solo Lectura)</option>
                                    <option value="Admin">Admin (Control Total)</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" class="btn-submit" style="background: linear-gradient(135deg, #a855f7, #6366f1); box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3); padding: 0.75rem; margin-top: 0.5rem;" id="btn-admin-submit">
                            Registrar Usuario
                        </button>
                    </form>
                </div>
            </section>

            <section aria-labelledby="table-heading">
                <div class="glass-card" style="padding: 2rem;">
                    <h2 id="table-heading" style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: white; display: flex; align-items: center; gap: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Usuarios Registrados
                    </h2>
                    <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;">
                        Lista de cuentas registradas en la base de datos MySQL.
                    </p>

                    <div class="admin-table-wrapper">
                        <table class="admin-table" aria-label="Tabla de usuarios registrados">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Correo Electrónico</th>
                                    <th>Rol</th>
                                    <th>Fecha Registro</th>
                                </tr>
                            </thead>
                            <tbody id="admin-table-body">
                                <tr>
                                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                                        Cargando usuarios desde la base de datos...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <div id="toast-container" class="toast-container"></div>

    <script src="app.js"></script>
</body>
</html>