const pool = require('../config/db');

class Report {
    static async create(crew_id, message){
         const queryText= `
            INSERT INTO crew_reports(crew_id, message)
            VALUES ($1, $2)
            RETURNING id
        `;
        const result = await pool.query(queryText, [crew_id, message]);
        return result.rows[0];
    }

    static async getAll(){
         const queryText= `
            SELECT
                r.id,
                r.message,
                r.created_at,
                c.title AS crew_title,
                c.id AS crew_id,
                s.name AS stage_name
            FROM crew_reports r
            JOIN crews c ON r.crew_id = c.id
            JOIN stages s ON c.stage_id = s.id
            ORDER BY r.created_at ASC
        `;
        const result = await pool.query(queryText);
        return result.rows;
    }

    static async delete(id){
        const result = await pool.query('DELETE FROM crew_reports WHERE id=$1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = Report;