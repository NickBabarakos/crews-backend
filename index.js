require('dotenv').config();
const groupCrews = require('./groupCrews.js');

const express = require('express');
const cors = require('cors');

const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const CREWS_PER_PAGE = 4;
const CHARACTERS_PER_PAGE = 60;

app.get('/api/stages', async(req,res) =>{
    const {stage, level} = req.query;
    const page = parseInt(req.query.page) || 1; 

    const offset = (page-1)*CREWS_PER_PAGE;

    try{
        const client = await pool.connect();
        const queryText = `
            WITH PagedCrews AS (
                SELECT crews.id
                FROM crews
                JOIN stages ON crews.stage_id = stages.id
                WHERE stages.name = $1 AND stages.level = $2
                ORDER BY crews.id
                LIMIT $3 OFFSET $4
            )
            SELECT
                c.id AS crew_id,
                c.title AS crew_title,
                c.video_url,
                cm.position,
                cm.required_level,
                char.id AS character_id,
                char.name AS character_name,
                char.image_url,
                char.info_url,
                char.type
            FROM
                crews c
            JOIN
                crew_members cm ON c.id = cm.crew_id
            JOIN
                characters char ON cm.character_id = char.id
            WHERE
                c.id IN (SELECT id FROM PagedCrews)
            ORDER BY
                c.id, char.id;
        `;

        const values = [stage, level, CREWS_PER_PAGE+1, offset];

        const result = await client.query(queryText, values);
        client.release();
        const groupedCrews = groupCrews(result.rows);
        const hasMore = groupedCrews.length > CREWS_PER_PAGE;
        const crewsForPage = groupedCrews.slice(0, CREWS_PER_PAGE);

        res.json({
            crews: crewsForPage,
            hasMore: hasMore
        });
    } catch (err){
        console.error(err);
        res.status(500).send('Error executing query');
    }



});


    app.get('/api/characters', async(req,res) =>{
        const {type} = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = CHARACTERS_PER_PAGE;
        const offset = (page-1)*limit;

        if(!type){ return res.status(400).send('The parameter "type" is mandatory');}

        const typeArray = type.split(',');

        try{
            const client = await pool.connect();

            const countQueryText = `SELECT COUNT(*) FROM characters WHERE type = ANY($1)`;
            const countResult = await client.query(countQueryText, [typeArray]);
            const totalCount = parseInt(countResult.rows[0].count,10);

            const queryText = `
                SELECT id, name, info_url, image_url, type
                FROM characters
                WHERE type = ANY($1)
                ORDER BY id
                LIMIT $2 OFFSET $3`;
            
                const values = [typeArray, limit+1, offset];
                const result = await client.query(queryText, values);
                client.release();

                const hasMore = result.rows.length > limit;
                const charactersForPage = result.rows.slice(0,limit);

                res.json({
                    characters: charactersForPage,
                    hasMore:hasMore,
                    totalCount: totalCount
                });
        } catch (err){
            console.error('Error:', err);
            res.status(500).send('Server Error');
        }
    });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
