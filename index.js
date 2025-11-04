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
                char.shop
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


app.get('/crews', async(req,res) => {
    try{
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM characters');
        
        client.release();

        res.json({ sucess: true, data: result.rows});
    } catch (err){
        console.error('Error executing query', err.stack);
        res.status(500).json({success:false,message:'Error fetching data from characters'} );
    }
}
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
