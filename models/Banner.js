const pool = require('../config/db');

class Banner{
    static async getActive(limit, offset){
        const queryText = `
            SELECT id, title, image_url, 
                (start_date::timestamp AT TIME ZONE 'America/Los_Angeles') as start_date,
                (end_date::timestamp AT TIME ZONE 'America/Los_Angeles') as end_date
            FROM banners
            WHERE (end_date::timestamp AT TIME ZONE 'America/Los_Angeles') > NOW()
            ORDER BY start_date DESC, id DESC
            LIMIT $1 OFFSET $2 
            `;
            const result = await pool.query(queryText, [limit, offset]);
            return result.rows;
    }

    static async countActive(){
        const queryText = `SELECT COUNT(*) FROM banners 
                            WHERE (end_date::timestamp AT TIME ZONE 'America/Los_Angeles') > NOW()
                            `;
        const result = await pool.query(queryText);
        return parseInt(result.rows[0].count, 10);
    }

    static async getById(id){
        const queryText = 'SELECT data_json FROM banners WHERE id=$1';
        const result = await pool.query(queryText, [id]);
        return result.rows[0];
    }

    static async create(title, image_url, start_date, end_date, data_json){
        const queryText = `
            INSERT INTO banners(title, image_url, start_date, end_date, data_json)
            VALUES ($1, $2, $3 AT TIME ZONE 'PST', $4 AT TIME ZONE 'PST', $5)
            RETURNING id;
        `;
        const result = await pool.query(queryText, [title, image_url, start_date, end_date, data_json]);
        return result.rows[0];
    }
}

module.exports = Banner;