// Script para generar el hash de la contraseña del usuario admin
// Ejecutar este archivo con: node hashAdmin.js

const bcrypt = require('bcrypt');
const password = 'AQUI_TU_CONTRASENA';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log('Hash:', hash);
});