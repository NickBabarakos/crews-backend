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


app.get('/api/stages', async(req,res) =>{
    const {stage, level} = req.query;
    const pageNumber = parseInt(req.query.page) || 1; 

    try{
        const client = await pool.connect();
        const queryText = `
            SELECT
                crews.id AS crew_id,
                crews.title AS crew_title,
                crews.video_url,
                crew_members.position,
                crew_members.required_level,
                characters.id AS character_id,
                characters.name AS character_name,
                characters.image_url,
                characters.info_url,
                characters.shop
            FROM
                stages
            JOIN
                crews ON stages.id = crews.stage_id
            JOIN 
                crew_members ON crews.id = crew_members.crew_id
            JOIN
                characters ON crew_members.character_id = characters.id
            WHERE
                stages.name = $1 AND stages.level = $2
            ORDER BY
                crews.id;
        `;
        const values = [stage, level];

        const result = await client.query(queryText, values);
        client.release();

        const Crews = groupCrews(result.rows);
        res.json(Crews);
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
