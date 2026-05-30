<?php
// Aquí puedes agregar la lógica de backend en el futuro para validar las credenciales
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? trim($_POST['password']) : '';

    // Ejemplo básico de validación (reemplázalo con tu lógica de Base de Datos o backend)
    if (!empty($email) && !empty($password)) {
        // Tu lógica de autenticación de la UMG aquí...
    }
}
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar Sesión - Portal Académico SO & Ciberseguridad</title>
    <meta name="description"
        content="Inicia sesión para acceder a los módulos de aprendizaje interactivo de Sistemas Operativos y Ciberseguridad.">
    <link rel="stylesheet" href="style.css">
</head>

<body class="page-login">

    <div class="login-container">
        <main class="glass-card login-card" id="login-panel">
            <header class="login-header">
                <h1>Iniciar Sesión</h1>
                <p>Ingresa a 7mo Semestre UMG</p>
            </header>

            <form id="login-form" action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="POST" novalidate>
                <div class="form-group">
                    <label for="email">Correo Electrónico</label>
                    <div class="input-wrapper">
                        <span class="input-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z">
                                    <path />
                                    <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </span>
                        <input type="email" id="email" name="email" class="form-input" placeholder="ejemplo@correo.com" required
                            autocomplete="email">
                    </div>
                </div>

                <div class="form-group">
                    <label for="password">Contraseña</label>
                    <div class="input-wrapper">
                        <span class="input-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </span>
                        <input type="password" id="password" name="password" class="form-input" placeholder="••••••••" required
                            autocomplete="current-password">
                    </div>
                </div>

                <button type="submit" class="btn-submit" id="btn-login-submit">
                    Iniciar Sesión
                </button>
            </form>
        </main>
    </div>

    <div id="toast-container" class="toast-container"></div>

    <script src="app.js"></script>
</body>

</html>