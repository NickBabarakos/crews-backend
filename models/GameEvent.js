const pool = require('../config/db');

class GameEvent{
    static async getAllActive(){
        const queryText= `
                SELECT
                    id,
                    name,
                    mode,
                    start_time AT TIME ZONE 'America/Los_Angeles' as start_time,
                    end_time AT TIME ZONE 'America/Los_Angeles' as end_time,
                    CASE
                        WHEN (start_time AT TIME ZONE 'America/Los_Angeles') <= NOW() THEN 'active'
                        ELSE 'upcoming'
                    END as status
                FROM game_events
                WHERE (end_time AT TIME ZONE 'America/Los_Angeles') > NOW()
                ORDER BY
                    (CASE WHEN (start_time AT TIME ZONE 'America/Los_Angeles') <= NOW() THEN 1 ELSE 2 END) ASC,
                    (CASE WHEN (start_time AT TIME ZONE 'America/Los_Angeles') <= NOW() then end_time ELSE start_time END) ASC
            `;

            const result = await pool.query(queryText);
            return result.rows;
    }

    static async rotateContent(mode, data) {
        const client = await pool.connect();
        try{
            if(mode === 'pirate_king_adventures'){
            //1. Διαγραφη crews/members του HEX2 (281,282,283) που φεύγει 
            await client.query(`DELETE FROM crew_members WHERE crew_id IN(SELECT id FROM crews WHERE stage_id IN(281,282,283))`);
            await client.query(`DELETE FROM crews WHERE stage_id IN(281, 282, 283)`);

            //2. Shift Crews: Τα Crews του HEX 1 (284-286) πάνε το HEX2 (281-283) και τα crews του BOSS(287-289) πάνε στο HEX1 (284-286)
            await client.query(`UPDATE crews SET stage_id = stage_id -3 WHERE stage_id BETWEEN 284 AND 289`);

            //3. Shift Stages: Μεταφορα ονομάτων και guides στον πίνακα stages. Μεταφορα από 284-286 -> 281-283
            await client.query(`UPDATE stages s1 SET name = s2.name, guide_json = s2.guide_json FROM stages s2 WHERE s1.id = s2.id - 3 AND s1.id BETWEEN 281 AND 283`);
            // Μεταφορα 287-289 -> 284-286
            await client.query(`UPDATE stages s1 SET name = s2.name, guide_json = s2.guide_json FROM stages s2 WHERE s1.id = s2.id - 3 AND s1.id BETWEEN 284 AND 286`);

            //4. INSERT NEW BOSS: Ενημέρωση των stages 287, 288, 289 με το νεο Boss
            await client.query(`UPDATE stages SET name = $1, guide_json = $2 WHERE id = 287`, [data.bossName, data.bossGuide80]);
            await client.query(`UPDATE stages SET name = $1, guide_json = $2 WHERE id = 288`, [data.bossName, data.bossGuide100]);
            await client.query(`UPDATE stages SET name = $1, guide_json = $2 WHERE id = 289`, [data.bossName, data.bossGuide150]);
        }

        if(mode === 'treasure_map'){
            await client.query(`DELETE FROM crew_members WHERE crew_id IN (SELECT id FROM crews WHERE stage_id IN (290, 291))`);
            await client.query(`DELETE FROM crews WHERE stage_id IN (290, 291)`);
            await client.query(`UPDATE stages SET name=$1, guide_json=$2 WHERE id=290`, [data.bossName, data.bossGuide]);
            await client.query(`UPDATE stages SET name=$1, guide_json = $2 WHERE id = 291`, [data.intrusionName, data.intrusionGuide]);
        }

        if(mode === 'kizuna_clash'){
            await client.query(`DELETE FROM crew_members WHERE crew_id IN (SELECT id FROM crews WHERE stage_id BETWEEN 292 AND 295)`);
            await client.query(`DELETE FROM crews WHERE stage_id BETWEEN 292 AND 295`);

            await client.query(`UPDATE stages SET name =$1, guide_json = $2 WHERE id=292`, [data.b1Name, data.b1Guide]);
            await client.query(`UPDATE stages SET name =$1, guide_json = $2 WHERE id=293`, [data.b2Name, data.b2Guide]);
            await client.query(`UPDATE stages SET name =$1, guide_json = $2 WHERE id=294`, [data.sb1Name, data.sb1Guide]);
            await client.query(`UPDATE stages SET name =$1, guide_json = $2 WHERE id=295`, [data.sb2Name, data.sb2Guide]);
        }

        await client.query('COMMIT');
        } catch(err){
            await client.query('ROLLBACK');
            throw err;
        } finally{
            client.release();
        }
    }
}

module.exports = GameEvent;