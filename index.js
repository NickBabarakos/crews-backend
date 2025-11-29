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

const DEFAULT_CREWS_PER_PAGE = 4;
const CHARACTERS_PER_PAGE = 60;

app.post('/api/stages/search', async(req,res) =>{
    const { mode, stage, level, challengeType, challengeDetail, forest, boss, ownedIds } = req.body;
    const limit = parseInt(req.query.limit) || DEFAULT_CREWS_PER_PAGE;
    const page = parseInt(req.query.page) || 1; 
    const offset = (page-1)*limit;

    let whereClause = '';
    let queryParams = [];

    if (!mode){ return res.status(400).send('Error: Mode parameter is required.'); }

    switch(mode) {
        case 'grand_voyage':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2 AND stages.level = $3';
            queryParams = ['grand_voyage', stage, level];
            break;

        case 'garp_challenge':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2 AND stages.level = $3';
            queryParams = ['garp_challenge', challengeType, challengeDetail];
            break;
        
        case 'forest_of_training':
            whereClause = 'WHERE stages.mode= $1 AND stages.name = $2';
            queryParams = ['forest_of_training', forest];
            break;
        
        case 'coliseum':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2 AND stages.level = $3';
            queryParams = ['coliseum', stage, level];
            break;
        
        case 'treasure_map':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2';
            queryParams = ['treasure_map', boss];
            break;
        
        case 'kizuna_clash':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2';
            queryParams = ['kizuna_clash', boss];
            break;
        
            case 'pirate_king_adventures':
                whereClause = 'WHERE stages.mode=$1 AND stages.level = $2';
                queryParams = ['pirate_king_adventures', level];
                break;

            default:
                return res.status(400).send('Error: Invalid mode specified.');
    }

    try{
        const client = await pool.connect();
        let filterCondition = '';

        if (ownedIds && Array.isArray(ownedIds) && ownedIds.length >0){
            const paramIndex = queryParams.length + 1;
            filterCondition = `HAVING bool_and(cm.character_id = ANY($${paramIndex}::int[]))`;
            queryParams.push(ownedIds);
        }

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

        const values = [...queryParams, limit+1, offset];

        const result = await client.query(queryText, values);
        client.release();

        const groupedCrews = groupCrews(result.rows);
        const hasMore = groupedCrews.length > limit;
        const crewsForPage = groupedCrews.slice(0, limit);

        res.json({
            crews: crewsForPage,
            hasMore: hasMore
        });
    } catch (err){
        console.error(err);
        res.status(500).send('Error executing query');
    }



});

    app.get('/api/stages/list', async(req,res) => {
        const {mode, level} = req.query;
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const offset = (page-1)*limit;

        if(!mode) {return res.status(400).send('Mode is required');}

        try{
            const client = await pool.connect();
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

            const countQuery= `
            SELECT COUNT(DISTINCT name)
            FROM stages
            WHERE mode=$1 AND ($2::text IS NULL OR level=$2)
            `;

            const queryParams = [mode, level || null, limit +1, offset];
            const countParams = [mode, level || null];
            const result = await client.query(queryText, queryParams);
            const countResult = await client.query(countQuery, countParams);

            client.release();

            const hasMore = result.rows.length > limit;
            const stages = result.rows.slice(0, limit);
            const totalCount = parseInt(countResult.rows[0].count, 10);

            res.json({
                stages: stages,
                hasMore: hasMore,
                totalCount: totalCount
            });
        } catch(err){
            console.error(err);
            res.status(500).send('Error fetching stage list');
        }
    });


    app.get('/api/characters', async(req,res) =>{
        const limit = parseInt(req.query.limit) || CHARACTERS_PER_PAGE;
        const {type, search} = req.query;
        const page = parseInt(req.query.page) || 1;
        const offset = (page-1)*limit;

        if(!type){ return res.status(400).send('The parameter "type" is mandatory');}

        const typeArray = type.split(',');

        try{
            const client = await pool.connect();

            let baseQuery = `FROM characters WHERE type = ANY($1)`;
            let queryParams = [typeArray];

            if (search) {
                baseQuery += ` AND (name ILIKE $2 OR CAST(id AS TEXT) LIKE $2)`;
                queryParams.push(`%${search}%`);
            }

            const countQueryText = `SELECT COUNT(*) ${baseQuery}`;
            const countResult = await client.query(countQueryText, queryParams);
            const totalCount = parseInt(countResult.rows[0].count,10);

            const queryText = `
                SELECT id, name, info_url, image_url, type
                ${baseQuery}
                ORDER BY id
                LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length +2}`;
            
                const finalParams = [...queryParams, limit +1, offset];
                const result = await client.query(queryText, finalParams);
                client.release();

                const hasMore = result.rows.length > limit;
                const charactersForPage = result.rows.slice(0, limit);

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


    app.get('/api/stage-info', async(req,res) => {
        const {mode, stage, level, challengeType, challengeDetail, forest, boss, bosses} = req.query;

        let whereClause='';
        let queryParams=[];

        if (!mode){ return res.status(400).send('Error: Mode parameter is required.'); }

        switch(mode) {
        case 'grand_voyage':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2 AND stages.level = $3';
            queryParams = ['grand_voyage', stage, level];
            break;

        case 'garp_challenge':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2 AND stages.level = $3';
            queryParams = ['garp_challenge', challengeType, challengeDetail];
            break;
        
        case 'forest_of_training':
            whereClause = 'WHERE stages.mode= $1 AND stages.name = $2';
            queryParams = ['forest_of_training', forest];
            break;
        
        case 'coliseum':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2 AND stages.level = $3';
            queryParams = ['coliseum', stage, level];
            break;
        
        case 'treasure_map':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2';
            queryParams = ['treasure_map', boss];
            break;
        
        case 'kizuna_clash':
            whereClause = 'WHERE stages.mode = $1 AND stages.name = $2';
            queryParams = ['kizuna_clash', boss];
            break;
        
            case 'pirate_king_adventures':
                whereClause = 'WHERE stages.mode=$1 AND stages.level = $2 AND stages.name=$3';
                queryParams = ['pirate_king_adventures', level, bosses];
                break;

            default:
                return res.status(400).send('Error: Invalid mode specified.');
    }

        try{
            const client = await pool.connect();
            const queryText = `SELECT guide_json FROM stages ${whereClause} LIMIT 1`;
            console.log("Executing Query", queryText);
            console.log("Params:", queryParams);
            const result = await client.query(queryText, queryParams);
            client.release();

            if (result && result.rows && result.rows.length > 0){
                console.log("Guide Found");
                const firstRow = result.rows[0];
                const guideData = firstRow.guide_json;
                console.log("Sending Data type:", typeof guideData);

                res.json({guide:guideData});
            } else{
                console.log("NO Match found via SQL");
                res.json({giude: null});
            }
        } catch(err){
            console.error(err);
            res.status(500).send('Error fetching stage info');
        }

        });
    
    app.get('/api/creators/leaderboard', async(req,res) =>{
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page-1)*limit;

        try{
            const client = await pool.connect();

            const queryText = `
                SELECT
                    c.id,
                    c.name,
                    c.channel_url,
                    COUNT(cr.id) as crew_count
                FROM creators c
                JOIN crews cr On c.id = cr.creator_id
                GROUP BY c.id, c.name, c.channel_url
                ORDER BY crew_count DESC
                LIMIT $1 OFFSET $2
            `;

            const countQuery = `
                SELECT COUNT(*) FROM (
                    SELECT c.id
                    FROM creators c
                    JOIN crews cr ON c.id = cr.creator_id
                    GROUP BY c.id
                ) AS distinct_creators
            `;

            const result = await client.query(queryText, [limit, offset]);
            const countResult = await client.query(countQuery);
            client.release();

            const totalCount = parseInt(countResult.rows[0].count, 10);
            const hasMore = (offset + result.rows.length) < totalCount;

            res.json({
                creators: result.rows,
                hasMore: hasMore,
                totalCount: totalCount
            });
        } catch(err){
            console.error('Error fetching creators:', err);
            res.status(500).send('Server Error');
        }
    });

    app.get('/api/banners', async(req,res) => {
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page-1)*limit;

        try{
            const client = await pool.connect();

            const queryText = `
                SELECT id, title, image_url, 
                start_date AT TIME ZONE 'PST' as start_date
               , end_date AT TIME ZONE 'PST' as end_date
                FROM banners
                WHERE end_date > NOW()
                ORDER BY start_date DESC, id DESC
                LIMIT $1 OFFSET $2 
            `;

            const countQuery = `SELECT COUNT(*) FROM banners WHERE end_date > NOW()`;

            const result = await client.query(queryText, [limit, offset]);
            const countResult = await client.query(countQuery);
            client.release();

            const totalCount = parseInt(countResult.rows[0].count,10);

            res.json({
                banners: result.rows,
                hasMore: (offset + result.rows.length) < totalCount,
                totalCount: totalCount
            });
        } catch(err){
            console.error('Error fetching banners:' ,err);
            res.status(500).send('Server Error');
        }
    });

    app.get('/api/banners/:id', async(req,res) => {
        const{id} = req.params;

        try{
            const client = await pool.connect();

            const bannerResult = await client.query('SELECT data_json from banners WHERE id=$1', [id]);

            if (bannerResult.rows.length === 0) {
                client.release();
                return res.status(404).json({error: 'Banner not found'});
            }

            const rawJSON = bannerResult.rows[0].data_json;

            let allCharIds = [];
            if(rawJSON.categories && Array.isArray(rawJSON.categories)){
                rawJSON.categories.forEach(cat => {
                    if(cat.character_ids) allCharIds.push(...cat.character_ids);
                });
            }

            let charMap = {};
            if (allCharIds.length>0){
                const charsResult = await client.query(
                    'SELECT id, name, image_url, info_url, type FROM characters WHERE id = ANY($1::int[])', [allCharIds]);
                    charsResult.rows.forEach(char=>{charMap[char.id] = char;});
            }
            client.release();

            const hydratedCategories = rawJSON.categories.map(cat => ({
                ...cat,
                characters: (cat.character_ids || []).map(id => charMap[id]).filter(Boolean)}));
        res.json({
            guide: {
                exclusive_chance: rawJSON.exclusive_chance || "0%",
                categories: hydratedCategories
            }
        });
        } catch(err){
            console.error(err);
            res.status(500).send('Error fetching banner info');
        }
    });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
