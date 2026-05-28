-- =======================================================
-- SCRIPT DE CREACIÓN DE BASE DE DATOS Y TABLA DE USUARIOS
-- Ejecutar en HeidiSQL o consola MySQL/MariaDB
-- =======================================================

-- 1. Crear la Base de Datos si no existe
CREATE DATABASE IF NOT EXISTS portal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE portal_db;

-- 2. Crear la Tabla de Usuarios con campo de Rol
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(64) NOT NULL, -- SHA256 hash (64 caracteres hexadecimales)
    rol VARCHAR(20) NOT NULL DEFAULT 'Normal', -- 'Normal' o 'Admin'
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Limpiar registros previos (opcional)
TRUNCATE TABLE usuarios;

-- 4. Insertar Usuarios de Prueba (Roles: Normal y Admin)
-- Las contraseñas están encriptadas en SHA256
-- Cuenta Administrador (Puede ver y crear usuarios)
-- Contraseña original: admin123 (SHA256 hasheada)
INSERT INTO usuarios (email, password, rol) 
VALUES ('admin@umg.edu.gt', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Admin');

-- Cuenta Normal (Solo puede ver el contenido)
-- Contraseña original: user123 (SHA256 hasheada)
INSERT INTO usuarios (email, password, rol) 
VALUES ('user@umg.edu.gt', 'e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446', 'Normal');

-- 5. Verificar registros
SELECT id, email, rol, fecha_creacion FROM usuarios;
