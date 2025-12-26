const pool = require('../config/db');

class UserBox {
    static async findByPublicKey(publicKey){
        const queryText = `SELECT public_key FROM user_boxes WHERE public_key = $1 LIMIT 1`;
        const result = await pool.query(queryText, [publicKey]);
        return result.rows[0];
    }

    static async create(publicKey, secretKey, dataToSave, favsToSave){
        const query = `
                INSERT INTO user_boxes (public_key, secret_key, box_data, favorites)
                VALUES ($1, $2, $3, $4)
                RETURNING public_key, secret_key
            `;
            const result = await pool.query(query, [publicKey, secretKey, dataToSave, favsToSave]);
            return result.rows[0];
    }

    static async findBySecretKey(secretKey){
        const query = `SELECT public_key, box_data, favorites FROM user_boxes WHERE secret_key = $1`;
        const result = await pool.query(query, [secretKey]);
        return result.rows[0];
    }

    static async update(secretKey, boxData, favorites){
        const query = `
                UPDATE user_boxes
                SET box_data = $1, favorites = $2::jsonb, last_updated = NOW()
                WHERE TRIM(secret_key) = TRIM($3)
                RETURNING public_key
            `;
        const result = await pool.query(query, [boxData, JSON.stringify(favorites), secretKey]);
        return result.rowCount > 0;
    }

    static async getDataByPublic(publicKey){
        const query = `SELECT box_data FROM user_boxes WHERE public_key = $1`;
        const result = await pool.query(query, [publicKey]);
        return result.rows[0];
    }
}

module.exports = UserBox;