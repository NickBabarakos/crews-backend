const pool = require('../config/db');
const {groupCrews} = require('../utils/helpers');

class Stage{

    static async getEventNames() {
        const queryText=`SELECT id, name FROM stages WHERE id IN (281, 284, 287, 290, 291, 292, 293, 294, 295) ORDER BY id ASC`;
        const result = await pool.query(queryText);

        const namesMap = {};
        result.rows.forEach(r=> namesMap[r.id] = r.name);
        return namesMap;
    }


    static async getList(mode, level, limit, offset){
            const queryText = `
            SELECT * FROM (
                SELECT DISTINCT On (name) id, name, image_url
                FROM stages
                WHERE mode = $1 AND ($2::text IS NULL OR level = $2)
                ORDER BY name, id DESC
            ) t
            ORDER BY id ASC
            LIMIT $3 OFFSET $4
            `;
            const result = await pool.query(queryText, [mode, level || null, limit, offset]);
            return result.rows;
    }

    static async countList(mode, level){
        const countQuery= `
            SELECT COUNT(DISTINCT name)
            FROM stages
            WHERE mode=$1 AND ($2::text IS NULL OR level=$2)
            `;
            const result = await pool.query(countQuery, [mode, level || null]);
            return parseInt(result.rows[0].count, 10);
    }

    static async getInfo(whereClause, queryParams) {
        const queryText = `SELECT id, guide_json FROM stages ${whereClause} LIMIT 1`;
        const result = await pool.query(queryText, queryParams);
        return result.rows[0];
    }

    static async searchCrews(whereClause, queryParams, filterCondition, limit, offset){
         const queryText = `
            WITH PagedCrews AS (
                SELECT c.id
                FROM crews c
                JOIN stages ON c.stage_id = stages.id
                JOIN crew_members cm ON c.id = cm.crew_id
                ${whereClause}
                GROUP BY c.id
                ${filterCondition}
                ORDER BY c.id
                LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
            )
            SELECT
                c.id AS crew_id,
                c.stage_id,
                stages.name AS stage_name,
                stages.level,
                c.title AS crew_title,
                c.video_url,
                c.guide_type,
                c.text_guide,
                cr.name AS creator_name,
                cm.position,
                cm.notes,
                char.id AS character_id,
                char.name AS character_name,
                char.image_url,
                char.info_url,
                char.type
            FROM
                crews c
            JOIN
                stages ON c.stage_id = stages.id
            LEFT JOIN
                creators cr ON c.creator_id = cr.id
            JOIN
                crew_members cm ON c.id = cm.crew_id
            JOIN
                characters char ON cm.character_id = char.id
            WHERE
                c.id IN (SELECT id FROM PagedCrews)
            ORDER BY
                c.id, char.id;
        `;

        const values = [...queryParams, limit, offset];
        const result = await pool.query(queryText, values);
        return groupCrews(result.rows);
    }
}

module.exports = Stage;