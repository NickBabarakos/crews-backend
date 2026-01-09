const pool = require('../config/db');

class Character{
    static async getLatest(limit = 6){
        const queryText = `
                SELECT id, name, image_url, type, info_url
                FROM characters
                WHERE NOT (id BETWEEN 4986 AND 4996)
                ORDER BY id DESC
                LIMIT $1
            `;

            const result = await pool.query(queryText, [limit]);
            return result.rows;
    }

    static async getAllIds(){
        const queryText = `SELECT id, type FROM characters`;
        const result = await pool.query(queryText);
        return result.rows;
    }

    static async search(type, search, limit, offset, userPublicKey){
        let baseQuery = `FROM characters`;
        let queryParams = [];
        let whereClauses = [];

        if(type && type !== 'ALL'){
            const typeArray = type.split(',');
            whereClauses.push(`type = ANY($${queryParams.length +1})`);
            queryParams.push(typeArray);
        }

        if (search) {
            whereClauses.push(`(name ILIKE $${queryParams.length+1} OR CAST(id AS TEXT) LIKE $${queryParams.length +1})`);
            queryParams.push(`%${search}%`);
        }

        if(whereClauses.length >0){
            baseQuery += ' WHERE ' + whereClauses.join(' AND ');
        }

        const idsQueryText = `SELECT id ${baseQuery}`;
        const idsResult = await pool.query(idsQueryText, queryParams);
        
        const matchingIds = idsResult.rows.map(row => row.id);
        const totalCount = matchingIds.length;

         const queryText = `
            SELECT id, name, info_url, image_url, type
            ${baseQuery}
            ORDER BY id
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length +2}`;
        
        const finalParams = [...queryParams, limit, offset];
        const result = await pool.query(queryText, finalParams);

        return{
            characters: result.rows,
            totalCount: totalCount,
            matchingIds: matchingIds
        };
    }

    static async getByIds(ids) {
        if (!ids || ids.length === 0) return [];
        const queryText = `
        SELECT id, name, image_url, info_url, type 
        FROM characters 
        WHERE id = ANY($1::int[])
        `;
        const result = await pool.query(queryText, [ids]);
        return result.rows;
    }

    static async create({id, name, info_url, image_url, type}){
        const queryText = `
        INSERT INTO characters (id, name, info_url, image_url, type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `;
        const result = await pool.query(queryText, [id, name, info_url, image_url, type]);
        return result.rows[0];
    }

    static async exists(id){
        const result = await pool.query('SELECT 1 FROM characters WHERE id=$1', [id]);
        return result.rows.length >0;
    }
}

module.exports = Character;