const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

// Configurar Helmet para headers de seguridad
app.use(helmet());

// Configurar CORS restrictivo
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '10kb' })); // Limitar tamaño del payload

// Rate Limiter para login (5 intentos por 15 minutos)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiter para crear usuarios (10 intentos por hora)
const createUserLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    message: 'Demasiadas solicitudes de creación. Intenta más tarde.',
    skipSuccessfulRequests: false,
});

// Función para sanitizar XSS
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return xss(input, {
        whiteList: {}, // Sin etiquetas HTML permitidas
        stripIgnoredTag: true,
    });
}

// Middleware para verificar JWT
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token && req.path === '/api/users') {
        return res.status(401).json({ success: false, message: 'Token no proporcionado.' });
    }
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Token inválido o expirado.' });
        }
    }
    next();
}

// MySQL Connection Pool Configuration
// Basado en las credenciales por defecto de HeidiSQL (Usuario root, Sin contraseña)
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'portal_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

// Función para hashear contraseñas con SHA256
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Función para generar JWT
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

// Intentar inicializar el pool de conexiones
try {
    pool = mysql.createPool(dbConfig);
    console.log('[DB] Pool de conexiones MySQL creado.');
} catch (error) {
    console.error('[DB Error] Error al configurar el pool de conexiones:', error.message);
}

// Helper para verificar si la base de datos está disponible
async function checkDbConnection(req, res, next) {
    try {
        const connection = await pool.getConnection();
        connection.release();
        next();
    } catch (err) {
        console.error('[DB Connection Fail]', err.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Error de conexión con la base de datos.' 
        });
    }
}

// Middleware para validar y sanitizar entrada
const validateAndSanitizeLogin = [
    body('email')
        .trim()
        .custom((value) => {
            // ✅ Bloquear caracteres especiales peligrosos
            const dangerousChars = ['<', '>', '"', "'", '&', ';', '(', ')', '{', '}', '|', '\\', '^', '`', '$'];
            for (let char of dangerousChars) {
                if (value.includes(char)) {
                    throw new Error('Correo contiene caracteres no permitidos.');
                }
            }
            // ✅ Bloquear palabras clave maliciosas
            const maliciousKeywords = ['script', 'alert', 'onclick', 'onerror', 'onload', 'javascript:', 'data:', 'vbscript:', 'iframe', 'img', 'svg'];
            const lowercaseValue = value.toLowerCase();
            for (let keyword of maliciousKeywords) {
                if (lowercaseValue.includes(keyword)) {
                    throw new Error('Correo contiene contenido sospechoso.');
                }
            }
            return true;
        })
        .isEmail()
        .normalizeEmail()
        .withMessage('Correo inválido.')
        .isLength({ max: 100 })
        .withMessage('Correo muy largo.'),
    body('password')
        .isLength({ min: 6, max: 100 })
        .withMessage('Contraseña entre 6 y 100 caracteres.')
        .trim(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: errors.array()[0].msg 
            });
        }
        next();
    }
];

const validateAndSanitizeUser = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Correo inválido.')
        .isLength({ max: 100 })
        .withMessage('Correo muy largo.'),
    body('password')
        .isLength({ min: 6, max: 100 })
        .withMessage('Contraseña entre 6 y 100 caracteres.')
        .trim(),
    body('rol')
        .isIn(['Normal', 'Admin'])
        .withMessage('Rol inválido.'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: errors.array()[0].msg 
            });
        }
        next();
    }
];

// --- ENDPOINTS DE API ---

// 1. Iniciar Sesión (Validación con SHA256 y JWT)
// NOTE: validateAndSanitizeLogin debe ejecutarse antes de checkDbConnection
app.post('/api/login', loginLimiter, validateAndSanitizeLogin, checkDbConnection, async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [rows] = await pool.query('SELECT id, email, password, rol FROM usuarios WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            console.warn(`[Security] Intento de login fallido para usuario: ${email}`);
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }
        
        const user = rows[0];
        
        // Hashear la contraseña ingresada y compararla con la almacenada
        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
            console.warn(`[Security] Contraseña incorrecta para usuario: ${email}`);
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }
        
        // Generar JWT token
        const token = generateToken(user);
        
        // Inicio de sesión exitoso
        return res.status(200).json({
            success: true,
            message: 'Autenticación exitosa',
            token: token,
            user: {
                email: user.email,
                rol: user.rol
            }
        });
        
    } catch (err) {
        console.error('[Login SQL Error]', err.message);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// 2. Obtener Lista de Usuarios (Solo Administradores)
app.get('/api/users', checkDbConnection, verifyToken, async (req, res) => {
    // Validar autorización de rol
    if (!req.user || req.user.rol !== 'Admin') {
        console.warn(`[Security] Intento de acceso no autorizado a /api/users`);
        return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }
    
    try {
        const [rows] = await pool.query('SELECT id, email, rol, fecha_creacion FROM usuarios ORDER BY id DESC');
        // Sanitizar datos antes de enviar
        const safeUsers = rows.map(u => ({
            id: u.id,
            email: sanitizeInput(u.email),
            rol: u.rol,
            fecha_creacion: u.fecha_creacion
        }));
        return res.status(200).json({ success: true, users: safeUsers });
    } catch (err) {
        console.error('[Get Users SQL Error]', err.message);
        return res.status(500).json({ success: false, message: 'Error al consultar usuarios.' });
    }
});

// 3. Registrar un Nuevo Usuario (Solo Administradores)
// 3. Registrar un Nuevo Usuario (Solo Administradores)
// Orden: verificar token -> validar entrada -> verificar conexión a BD
app.post('/api/users', createUserLimiter, verifyToken, validateAndSanitizeUser, checkDbConnection, async (req, res) => {
    // Validar autorización de rol
    if (!req.user || req.user.rol !== 'Admin') {
        console.warn(`[Security] Intento de creación de usuario sin permisos`);
        return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }
    
    const { email, password, rol } = req.body;
    
    try {
        // Sanitizar email antes de almacenar
        const sanitizedEmail = sanitizeInput(email);
        
        // Hashear la contraseña antes de almacenarla
        const hashedPassword = hashPassword(password);
        
        // Insertar en la BD con datos sanitizados
        await pool.query('INSERT INTO usuarios (email, password, rol) VALUES (?, ?, ?)', 
            [sanitizedEmail, hashedPassword, rol]);
        
        console.log(`[Security] Nuevo usuario creado: ${sanitizedEmail} por admin`);
        
        return res.status(201).json({ 
            success: true, 
            message: `Usuario registrado con éxito.` 
        });
    } catch (err) {
        // Controlar correos duplicados
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Este correo ya está registrado.' });
        }
        console.error('[Insert User SQL Error]', err.message);
        return res.status(500).json({ success: false, message: 'Error al registrar usuario.' });
    }
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('[Error]', err.message);
    res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor.' 
    });
});

// Arrancar el Servidor
app.listen(PORT, () => {
    console.log(`[Server] ✅ Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`[Security] 🔒 Protecciones activas: Helmet, CORS restrictivo, Rate Limiting, JWT, XSS`);
});
