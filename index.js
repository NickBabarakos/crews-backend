require('dotenv').config();
const groupCrews = require('./groupCrews.js');

const express = require('express');
const cors = require('cors');

const { Pool } = require('pg');

const os = require('os');

const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const generateKey = (prefix) => {
    return `${prefix}-${crypto.randomBytes(4).toString('hex')}-${crypto.randomBytes(4).toString('hex')}`;
};

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
            filterCondition = `HAVING bool_and(
            cm.character_id = ANY($${paramIndex}::int[])
             OR cm.character_id IS NULL
             OR cm.position = 'Friend Captain'
             OR(cm.notes IS NOT NULL AND LOWER(TRIM(cm.notes))= 'optional'))`;
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
                c.stage_id,
                stages.name AS stage_name,
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


        try{
            const client = await pool.connect();

            let baseQuery = `FROM characters`;
            let queryParams = [];
            let whereClauses = [];

            if(type !== 'ALL'){
                const typeArray=type.split(',');
                whereClauses.push(`type = ANY($${queryParams.length+1})`);
                queryParams.push(typeArray);
            }


            if (search) {
                whereClauses.push(`(name ILIKE $${queryParams.length+1} OR CAST(id AS TEXT) LIKE $${queryParams.length +1})`);
                queryParams.push(`%${search}%`);
            }

            if(whereClauses.length >0){
                baseQuery += ' WHERE ' + whereClauses.join(' AND ');
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

    app.get('/api/characters/all-ids', async (req, res) => {
        try{
            const client = await pool.connect();
            const queryText = 'SELECT id, type FROM characters';
            const result = await client.query(queryText);
            client.release();

            res.json(result.rows);
        } catch(err){
            console.error('Error fetching all ids:', err);
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
            const queryText = `SELECT id, guide_json FROM stages ${whereClause} LIMIT 1`;
            console.log("Executing Query", queryText);
            console.log("Params:", queryParams);
            const result = await client.query(queryText, queryParams);
            client.release();

            if (result && result.rows && result.rows.length > 0){
                console.log("Guide Found");
                const firstRow = result.rows[0];
                const guideData = firstRow.guide_json;
                const stageId = firstRow.id;
                console.log("Sending Data type:", typeof guideData);

                res.json({
                    id: stageId,
                    guide:guideData});
            } else{
                console.log("NO Match found via SQL");
                res.json({guide: null, id:null});
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
                    c.social_url,
                    COUNT(cr.id) as crew_count
                FROM creators c
                JOIN crews cr On c.id = cr.creator_id
                GROUP BY c.id, c.name, c.social_url
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

    app.get('/api/crews/:id/context', async(req, res) => {
        const {id} = req.params;
        try{
            const client = await pool.connect();

            const crewQuery = `
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
            const crewResult = await client.query(crewQuery, [id]);

            if(crewResult.rows.length === 0) {
                client.release();
                return res.status(404).json({error: 'Crew not found'});
            }

            const crewData = crewResult.rows[0];

            const rankQuery =`
                SELECT COUNT(*) as rank
                FROM crews
                WHERE stage_id = $1 AND id <= $2
            `;

            const rankResult = await client.query(rankQuery, [crewData.stage_id, id]);
            client.release();

            const rank = parseInt(rankResult.rows[0].rank, 10);

            res.json({
                ...crewData,
                rank: rank
            });
        } catch(err){
            console.error(err);
            res.status(500).send('Server Error fetching crew context');
        }
    });


    app.post('/api/creators/verify-handle', async(req, res) => {
        const { social_url } = req.body;

        if(!social_url) return res.status(400).json({ error: 'URL required'});

        try{
            const client = await pool.connect();
            const query = 'SELECT id, name, social_url FROM creators WHERE social_url = $1 LIMIT 1';
            const result = await client.query(query, [social_url]);
            client.release();

            if(result.rows.length > 0){
                res.json({
                    status: 'FOUND',
                    creator: result.rows[0]
                });
            } else {
                res.json({status: 'NOT_FOUND'});
            }
        } catch(err){
            console.error('verify Handle Error', err);
            res.status(500).json({ error: 'Server check failed'});
        }
    });

    app.post('/api/creators/verify-key', async(req,res)=> {
        const { public_key } = req.body;

        if(!public_key) return res.status(400).json({error: 'Key required'});

        try{
            const client = await pool.connect();

            const creatorQuery = 'SELECT id,name,public_key FROM creators WHERE public_key = $1 LIMIT 1';
            const creatorResult = await client.query(creatorQuery, [public_key]);

            if(creatorResult.rows.length > 0){
                client.release();
                return res.json({
                    status:'CREATOR_FOUND',
                    creator: creatorResult.rows[0]
                });
            }

            const boxQuery = 'SELECT public_key FROM user_boxes WHERE public_key = $1 LIMIT 1';
            const boxResult = await client.query(boxQuery, [public_key]);
            client.release();

            if(boxResult.rows.length > 0){
                return res.json({ status: 'VALID_KEY_NO_CREATOR'});
            } else {
                return res.json({status: 'INVALID_KEY'});
            }
        } catch (err){
            console.error('Verify Key Error:', err);
            res.status(500).json({error: 'Server check failed'});
        }
    });

    app.post('/api/crews/submit', async(req,res) => {
        const{
            stage_id,
            user_name,
            crew_data,
            creator_url,
            creator_key,
            confirmed_creator_id,
            guide_type,
            video_url,
            text_guide_details,
            title
        } = req.body;

        if(!stage_id || !user_name || !crew_data || !guide_type) { return res.status(400).json({error: 'Missing required fields (stage, user, crew data, or guide type).'});}

        if(guide_type === 'video' && !video_url){ return res.status(400).json({error: 'Video URL is required for video guides'});}

        if(guide_type === 'text' && !text_guide_details){ return res.status(400).json({error: 'Instructions are required for text guides.'});}

        try{
            const client = await pool.connect();

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

            const result = await client.query(insertQuery, values);
            client.release();

            res.json({
                success: true,
                message: 'Your crew has been submitted and is pending approval!',
                pendingId: result.rows[0].id
            });
        } catch(err){
            console.error('Error submitting crew:', err);
            res.status(500).json({error: 'Internal Server Error during submission'});
        }
    });

    app.post('/api/box/create', async(req,res) => {
        const { initialData, favorites } = req.body;

        const publicKey= generateKey('pub');
        const secretKey = generateKey('sec');

        try{
            const client = await pool.connect();
            const query = `
                INSERT INTO user_boxes (public_key, secret_key, box_data, favorites)
                VALUES ($1, $2, $3, $4)
                RETURNING public_key, secret_key
            `;

            const dataToSave = initialData || {};
            const favsToSave = favorites || [];

            await client.query(query, [publicKey, secretKey, dataToSave, favsToSave]);
            client.release();

            res.json({ success: true, publicKey, secretKey});
        } catch(err){
            console.error('Error creating box:', err);
            res.status(500).json({error: 'Failed to create box'});
        }
    });

    app.post('/api/box/update', async(req, res) => {
        const { secretKey, boxData, favorites } = req.body;

        if(!secretKey) return res.status(401).json({error: 'Secret key required'});

        try{
            const client = await pool.connect();
            const query = `
                UPDATE user_boxes
                SET box_data = $1, favorites = $2::jsonb, last_updated = NOW()
                WHERE TRIM(secret_key) = TRIM($3)
                RETURNING public_key
            `;
            const result = await client.query(query, [boxData, JSON.stringify(favorites || []), secretKey]);
            client.release();

            if(result.rowCount === 0){
                return res.status(403).json({error: 'Invalid secret key'});
            }

            res.json({success: true});
        } catch (err){
            console.error('Error updating box:', err);
            res.status(500).json({error: 'Failed to update box'})
        }
    });

    app.post('/api/box/restore', async(req, res) => {
        const { secretKey } = req.body;

        try {
            const client = await pool.connect();
            const query = `SELECT public_key, box_data, favorites FROM user_boxes WHERE secret_key = $1`;
            const result = await client.query(query, [secretKey]);
            client.release();

            if(result.rows.length === 0){
                return res.status(404).json({error: 'Box not found'});
            }

            res.json({
                success: true,
                publicKey: result.rows[0].public_key,
                boxData: result.rows[0].box_data,
                favorites: result.rows[0].favorites || []
            });
        } catch(err){
            console.error('Error restoring box:', err);
            res.status(500).json({error: 'Server error'});
        }
    });

    app.get('/api/box/view/:publicKey', async(req, res)=>{
        const {publicKey} = req.params;

        try{
            const client = await pool.connect();
            const query = `SELECT box_data FROM user_boxes WHERE public_key = $1`;
            const result = await client.query(query, [publicKey]);
            client.release();

            if(result.rows.length === 0){
                return res.status(404).json({error: 'Box not found'});
            }

            res.json({boxData: result.rows[0].box_data});
        } catch(err){
            console.error('Error viewing box:', err);
            res.status(500).json({error: 'Server error'});
        }
    });

const adminAuth = (req, res, next) => {
    const secret = req.headers['x-admin-secret'];
    if(!secret || secret !== process.env.ADMIN_SECRET){
        return res.status(401).json({error: 'Unauthorized: Invalid Admin Secret'});
    }
    next();
};

app.post('/api/admin/character', adminAuth, async(req,res) => {
    const {id, name, info_url, type} = req.body;

    if(!id || !name || !info_url || !type){
        return res.status(400).json({error: 'All fields (id, name, info_url, type) are requird'});
    }

    const image_url = `/unit_icons/${id}`;

    try{
        const client = await pool.connect();

        const checkQuery = 'SELECT id FROM characters WHERE id=$1';
        const checkRes = await client.query(checkQuery, [id]);

        if(checkRes.rows.length > 0){
            client.release();
            return res.status(409).json({error: `Character with ID ${id} already exists`});
        }

        const insertQuery = `
        INSERT INTO characters (id, name, info_url, image_url, type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `;
        const result = await client.query(insertQuery, [id, name, info_url, image_url, type]);

        client.release();

        res.json({
            success: true,
            message: `Character ${name} added successfully!`,
            character: result.rows[0]
        });
    }catch(err){
        console.error('Admin Inser Error:', err);
        res.status(500).json({error: 'Database error during insetion'});

    }
});

app.post('/api/admin/check-creator', adminAuth, async(req,res) => {
    const { social_url, public_key} = req.body;

    if(!social_url && !public_key){
        return res.status(400).json({ error: 'Channel URL or Public Key is required'});
    }

    try{
        const client = await pool.connect();

        let queryText, params;
        if(public_key){
            queryText= 'SELECT id, name, social_url, public_key FROM creators WHERE public_key = $1 LIMIT 1';
            params = [public_key];
        } else {
            queryText = 'SELECT id, name, social_url, public_key FROM creators WHERE social_url = $1 LIMIT 1';
            params = [social_url]
        }

        const result = await client.query(queryText, params);

        client.release();

        if(result.rows.length > 0){
            res.json({
                exists: true,
                creator: result.rows[0]
            });
        } else{
            res.json({
                exists: false
            });
        }
        
    } catch(err) {
        console.error('Check Creator Error:', err);
        res.status(500).json({error: 'Database error while checking creator'});
    }
});

app.post('/api/admin/create-creator', adminAuth, async(req,res) => {
    const { name, social_url, public_key } = req.body;

    if(!name || (!social_url && !public_key)){
        return res.status(400).json({ error: 'Name and either Channel URL or Public Key are required'});
    }

    try{
        const client = await pool.connect();

        const insertQuery= `
            INSERT INTO creators (name, social_url, public_key)
            VALUES ($1, $2, $3)
            RETURNING id, name, social_url, public_key
        `;

        const result = await client.query(insertQuery, [name, social_url || null, public_key || null]);
        client.release();

        res.json({
            success: true,
            message: 'Creator created successfully',
            creator: result.rows[0]
        });
    } catch(err){
        console.error('Create Creator Error:', err);
        res.status(500).json({error: 'Failed to create creator. Name or URL might be invalide'});
    }
});

app.get('/api/creators/check-name/:name', async(req,res) => {
    try{
        const client = await pool.connect();
        const result = await client.query('SELECT id FROM creators WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1', [req.params.name]);
        client.release();
        res.json({exists: result.rows.length >0});
    } catch (err){
        res.status(500).json({error: 'Server error checking the name'});
    }
});

app.post('/api/admin/create-crew', adminAuth, async(req,res) => {
    const {
        title,
        stage_id,
        video_url,
        creator_id,
        guide_type,
        text_guide,
        members
    } = req.body;

    if(!title || !stage_id || !creator_id || !guide_type){
        return res.status(400).json({error: 'Missing required fields (title, stage, creator or guide type.'});
    }

    const client = await pool.connect();

    try{
        await client.query('BEGIN');

        const insertCrewQuery = `
            INSERT INTO crews (title, stage_id, video_url, creator_id, guide_type, text_guide)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;

        const crewValues = [
            title,
            stage_id,
            video_url || null,
            creator_id,
            guide_type, 
            text_guide || null
        ];

        const crewResult = await client.query(insertCrewQuery, crewValues);
        const newCrewId = crewResult.rows[0].id;

        if(members && Array.isArray(members) && members.length >0){
            const insertMemberQuery = `
                INSERT INTO crew_members (crew_id, character_id, position, notes)
                VALUES ($1, $2, $3, $4)
            `;

            for (const member of members){
                if(member.character_id){
                    await client.query(insertMemberQuery, [
                        newCrewId,
                        member.character_id,
                        member.position,
                        member.notes || null
                    ]);
                }
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Crew and members created successfully!',
            crewId: newCrewId
        });
    } catch (err){
        await client.query('ROLLBACK');
        console.error('Create Crew Transaction Error', err);
        res.status(500).json({
            error: 'Database Transaction Failed',
            details: err.detail || err.message,
            constraint: err.constraint
        });
    } finally {
        client.release();
    }
});

app.get('/api/admin/pending-crews', adminAuth, async(req,res) => {
    try{
        const client = await pool.connect();
        const query = `
        SELECT pc.*, s.name as stage_name
        FROM pending_crews pc
        JOIN stages s ON pc.stage_id = s.id
        ORDER BY pc.id ASC
        `;
        const result = await client.query(query);
        client.release();
        res.json(result.rows);
    } catch (err){
        console.error('Fetch Pending Crews Error:', err);
        res.status(500).json({error: 'Failed to fetch pending crews'});
    }
});

app.delete('/api/admin/pending-crews/:id', adminAuth,async (req,res)=> {
    const { id } = req.params;
    try{
        const client = await pool.connect();
        await client.query('DELETE FROM pending_crews WHERE id=$1', [id]);
        client.release();
        res.json({success: true, message: 'Pending crew deleted'});
    } catch(err){
        console.error('Delete Pending Crew Error:', err);
        res.status(500).json({error: 'Failed to delete pending crew'});
    }
});

app.post('/api/reports/submit', async(req,res) => {
    const {crew_id, message} = req.body;

    if(!crew_id || !message){
        return res.status(400).json({error: 'Crew ID and message are required'});
    }

    try{
        const client = await pool.connect();
        const queryText= `
            INSERT INTO crew_reports(crew_id, message)
            VALUES ($1, $2)
            RETURNING id
        `;
        await client.query(queryText, [crew_id, message]);
        client.release();

        res.json({success: true, message: 'Report submitted successfully'});
    } catch(err){
        console.error('Submit Report Error:', err);
        res.status(500).json({error: 'Failed to submit report'});
    }
});

app.get('/api/admin/reports', adminAuth, async(req,res) => {
    try{
        const client = await pool.connect();
        const queryText= `
            SELECT
                r.id,
                r.message,
                r.created_at,
                c.title AS crew_title,
                c.id AS crew_id,
                s.name AS stage_name
            FROM crew_reports r
            JOIN crews c ON r.crew_id = c.id
            JOIN stages s ON c.stage_id = s.id
            ORDER BY r.created_at ASC
        `;
        const result = await client.query(queryText);
        client.release();

        res.json(result.rows);
    } catch(err){
        console.error('Fetch Reports Error', err);
        res.status(500).json({error:'Failed to fetch reports'});
    }
});

app.delete('/api/admin/reports/:id', adminAuth, async(req,res)=> {
    const {id} = req.params;

    try{
        const client = await pool.connect();
        await client.query('DELETE FROM crew_reports WHERE id=$1', [id]);
        client.release();

        res.json({success: true, message:'Report resolved/deleted successfully'});
    } catch(err){
        console.error('Delete Report Error:', err);
        res.status(500).json({error: 'Failed to delete report'});
    }
});

app.post('/api/admin/banner', adminAuth, async(req,res)=> {
    const { title, image_url, start_date, end_date, data_json } = req.body;

    if(!title || !image_url || !start_date || !end_date || !data_json){
        return res.status(400).json({error: 'All fields are required'});
    }

    try{
        const client = await pool.connect();
        const insertQuery = `
            INSERT INTO banners(title, image_url, start_date, end_date, data_json)
            VALUES ($1, $2, $3 AT TIME ZONE 'PST', $4 AT TIME ZONE 'PST', $5)
            RETURNING id;
        `;

        const finalJson = typeof data_json === 'string' ? JSON.parse(data_json) : data_json;

        const result = await client.query(insertQuery, [title, image_url, start_date, end_date, finalJson]);
        client.release();

        res.json({
            success: true,
            message: 'Banner created successfully',
            bannerId: result.rows[0].id
        });

    } catch(err){
        console.error('Create Banner Error', err);
        res.status(500).json({error: 'Failed to create banner', details: err.message});
    }
});

app.delete('api/admin/crews/:id', adminAuth, async(req,res) => {
    const {id} = req.params;
    const client = await pool.connect();
    try{
        await client.query('BEGIN');
        await client.query('DELETE FROM crew_members WHERE crew_id = $1', [id]);
        const result = await client.query('DELETE FROM crews WHERE id=$1', [id]);

        if(result.rowCount === 0){
            throw new Error('Crew not found');
        }
        await client.query('COMMIT');
        res.json({success: true, message: `Crew ${id} and its members deleted`});
    } catch (err){
        await client.query('ROLLBACK');
        res.status(500).json({error: err.message});
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    let networkIp = 'localhost';

    for(const name of Object.keys(interfaces)){
        for(const iface of interfaces[name]){
            if(iface.family === 'IPv4' && !iface.internal){
                networkIp = iface.address;
                break;
            }
        }
    }
    console.log('App running on:');
    console.log(`-Local: http://localhost:${PORT}`);
    console.log(`-Network: http://${networkIp}:${PORT}`);
}
);
