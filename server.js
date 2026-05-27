const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
            message: 'Error de conexión con la base de datos. Por favor, asegúrate de tener MySQL activo y de haber ejecutado el script database.sql.' 
        });
    }
}

// --- ENDPOINTS DE API ---

// 1. Iniciar Sesión (Validación contra base de datos)
app.post('/api/login', checkDbConnection, async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Correo y contraseña son obligatorios.' });
    }
    
    try {
        const [rows] = await pool.query('SELECT email, password, rol FROM usuarios WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });
        }
        
        const user = rows[0];
        
        // Verificación de contraseña simple (texto plano para fines académicos)
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
        }
        
        // Inicio de sesión exitoso
        return res.status(200).json({
            success: true,
            message: 'Autenticación exitosa',
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
app.get('/api/users', checkDbConnection, async (req, res) => {
    const userRole = req.headers['x-user-role'];
    
    // Validar autorización de rol
    if (userRole !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Solo administradores pueden realizar esta acción.' });
    }
    
    try {
        const [rows] = await pool.query('SELECT id, email, rol, fecha_creacion FROM usuarios ORDER BY id DESC');
        return res.status(200).json({ success: true, users: rows });
    } catch (err) {
        console.error('[Get Users SQL Error]', err.message);
        return res.status(500).json({ success: false, message: 'Error al consultar usuarios.' });
    }
});

// 3. Registrar un Nuevo Usuario (Solo Administradores)
app.post('/api/users', checkDbConnection, async (req, res) => {
    const userRole = req.headers['x-user-role'];
    const { email, password, rol } = req.body;
    
    // Validar autorización de rol
    if (userRole !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Acceso denegado. Solo administradores pueden crear usuarios.' });
    }
    
    if (!email || !password || !rol) {
        return res.status(400).json({ success: false, message: 'Todos los campos (correo, contraseña y rol) son requeridos.' });
    }
    
    try {
        // Insertar en la BD
        await pool.query('INSERT INTO usuarios (email, password, rol) VALUES (?, ?, ?)', [email, password, rol]);
        
        return res.status(201).json({ 
            success: true, 
            message: `Usuario ${email} registrado con éxito con el rol: ${rol}.` 
        });
    } catch (err) {
        // Controlar correos duplicados
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Este correo electrónico ya está registrado.' });
        }
        console.error('[Insert User SQL Error]', err.message);
        return res.status(500).json({ success: false, message: 'Error interno al registrar el usuario.' });
    }
});

// Arrancar el Servidor
app.listen(PORT, () => {
    console.log(`[Server] Servidor ejecutándose en http://localhost:${PORT}`);
});
