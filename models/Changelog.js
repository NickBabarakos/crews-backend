const pool = require('../config/db');

class Changelog{
    static async getRecent(){
         const queryText = `
                SELECT id, title, text, pinged, created_at
                FROM changelog
                ORDER BY pinged DESC, created_at DESC
                LIMIT 5
            `;

            const result = await pool.query(queryText);
            return result.rows;
    }
}

module.exports = Changelog;