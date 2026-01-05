const pool = require('../config/db');

class PendingCrew{
    static async submit(data){

        const {
            stage_id, user_name, creator_url, creator_key, confirmed_creator_id, crew_data, guide_type, video_url, text_guide_details, title
        } = data;
        
        const insertQuery = `
                INSERT INTO pending_crews(
                    stage_id,
                    user_name,
                    creator_url,
                    creator_key,
                    confirmed_creator_id,
                    crew_data,
                    guide_type,
                    video_url,
                    text_guide_details,
                    title,
                    submitted_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                RETURNING id;
            `;

            const values = [
                stage_id,
                user_name,
                creator_url || null,
                creator_key || null,
                confirmed_creator_id || null,
                crew_data,
                guide_type,
                video_url || null,
                text_guide_details || null,
                title || null
            ];

            const result = await pool.query(insertQuery, values);
            return result.rows[0].id;
    }
    
    static async getAll(){
        const queryText = `
        SELECT pc.*, s.name as stage_name
        FROM pending_crews pc
        JOIN stages s ON pc.stage_id = s.id
        ORDER BY pc.id ASC
        `;
        const result = await pool.query(queryText);
        return result.rows;
    }

    static async delete(id){
        const result = await pool.query('DELETE FROM pending_crews WHERE id=$1', [id]);
        return result.rowCount > 0;
    }
}

module.exports = PendingCrew;