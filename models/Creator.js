const pool = require('../config/db');

class Creator{
    static async getLeaderboard(limit, offset){
        const queryText = `
                SELECT
                    c.id,
                    c.name,
                    c.social_url,
                    c.public_key,
                    COUNT(cr.id) as crew_count
                FROM creators c
                JOIN crews cr On c.id = cr.creator_id
                GROUP BY c.id, c.name, c.social_url, c.public_key
                ORDER BY crew_count DESC, c.name ASC, c.id ASC
                LIMIT $1 OFFSET $2
            `;
            const result = await pool.query(queryText, [limit, offset]);
            return result.rows;
    }

    static async countLeaderboard(){
        const countQuery = `
                SELECT COUNT(*) FROM (
                    SELECT c.id
                    FROM creators c
                    JOIN crews cr ON c.id = cr.creator_id
                    GROUP BY c.id
                ) AS distinct_creators
            `;
            const result = await pool.query(countQuery);
            return parseInt(result.rows[0].count, 10);
    }

    static async findBySocialUrl(url){
        const queryText = 'SELECT id, name, social_url FROM creators WHERE LOWER(TRIM(social_url)) = LOWER(TRIM($1)) LIMIT 1';
        const result = await pool.query(queryText, [url]);
        return result.rows[0];
    }

    static async findByPublicKey(key){
        const queryText = 'SELECT id, name, public_key FROM creators WHERE public_key = $1 LIMIT 1';
        const result = await pool.query(queryText, [key]);
        return result.rows[0];
    }

    static async findByName(name){
        const queryText = 'SELECT id FROM creators WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1';
        const result = await pool.query(queryText, [name]);
        return result.rows[0];
    }

    static async create(name, social_url, public_key){
        const queryText= `
            INSERT INTO creators (name, social_url, public_key)
            VALUES ($1, $2, $3)
            RETURNING id, name, social_url, public_key
        `;
        const result = await pool.query(queryText, [name, social_url || null, public_key || null]);
        return result.rows[0];
    }
}

module.exports = Creator;