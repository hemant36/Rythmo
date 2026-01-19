// ===== DEPENDENCIAS Y CONFIGURACIÓN =====
const pool = require("../config/database");

// ===== OBJETO CAPTCHASESSION =====
const CaptchaSession = {
  /**
     * Crear un nuevo captcha
     */
  async create(id, text, email) {
    // Borra los captchas previos del usuario
    await pool.query(
      "DELETE FROM captcha_sessions WHERE email = ?",
      [email]
    );

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    await pool.query(
      "INSERT INTO captcha_sessions (id, text, email, expires_at) VALUES (?, ?, ?, ?)",
      [id, text, email, expiresAt]
    );
  },

  /**
     * Buscar un captcha por id
     */
  async findById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM captcha_sessions WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  /**
     * Elimina un captcha por id
     */
  async delete(id) {
    await pool.query(
      "DELETE FROM captcha_sessions WHERE id = ?",
      [id]
    );
  },

  /**
     * Elimina los captchas expirados
     */
  async cleanExpired() {
    await pool.query(
      "DELETE FROM captcha_sessions WHERE expires_at < NOW()"
    );
  }
};

// ===== EXPORTACIÓN DEL MODELO =====
module.exports = CaptchaSession;