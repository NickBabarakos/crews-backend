const pool = require('../config/db');

class Crew{
    static async countAll(){
        const result = await pool.query('SELECT COUNT(*) FROM crews');
        return parseInt(result.rows[0].count, 10);
    }

    static async getContext(id) {
        const queryText = `
                SELECT
                    c.id as crew_id,
                    c.stage_id,
                    s.mode,
                    s.name as stage_name,
                    s.level,
                    s.image_url,
                    s.id as stage_id
                FROM crews c
                JOIN stages s ON c.stage_id = s.id
                WHERE c.id = $1
            `;
            const result = await pool.query(queryText, [id]);
            return result.rows[0];
    }

    static async getRank(stageId, crewId){
        const queryText =`
                SELECT COUNT(*) as rank
                FROM crews
                WHERE stage_id = $1 AND id <= $2
            `;
            const result = await pool.query(queryText, [stageId, crewId]);
            return parseInt(result.rows[0].rank, 10);
    }

    static async delete(id) {
        const client = await pool.connect();
        try{
            await client.query('BEGIN');
            await client.query('DELETE FROM crew_members WHERE crew_id = $1', [id]);
            const result = await client.query('DELETE FROM crews WHERE id=$1', [id]);
            await client.query('COMMIT');
            return result.rowCount >0;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally{
            client.release();
        }
    }

    static async createFullCrew(crewData, members){
        const {title, stage_id, video_url, creator_id, guide_type, text_guide} = crewData;

        const client = await pool.connect();
        try{
            await client.query('BEGIN');

        const queryText = `
            INSERT INTO crews (title, stage_id, video_url, creator_id, guide_type, text_guide)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        const crewRes = await client.query(queryText, [title, stage_id, video_url, creator_id, guide_type, text_guide]);
        const newCrewId = crewRes.rows[0].id;

        if(members && members.length > 0){
            const insertMember = `INSERT INTO crew_members (crew_id, character_id, position, notes) VALUES ($1, $2, $3, $4)`;
            for(const m of members){
                if(m.character_id) await client.query(insertMember, [newCrewId, m.character_id, m.position, m.notes || null]);
            }
        }
        await client.query('COMMIT');
        return newCrewId;
        } catch (err){
            await client.query('ROLLBACK');
            throw err;
        } finally{
            client.release();
        }
    }
}

module.exports = Crew;