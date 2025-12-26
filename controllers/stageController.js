const Stage = require('../models/Stage');
const {buildStageQuery} = require('../utils/helpers');

const DEFAULT_CREWS_PER_PAGE = 4;

const getEventNames = async (req,res) => {
    try{
        const names = await Stage.getEventNames();
        res.json(names);
    } catch (err){
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const getList = async (req, res) => {
    const {mode, level} = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt (req.query.page) || 1;
    const offset = (page-1)*limit;

    if(!mode) { return res.status(400).send("Mode is required");}

    try{
        const stages = await Stage.getList(mode, level, limit +1, offset);
        const totalCount = await Stage.countList(mode,level);

        const hasMore = stages.length > limit;
        const resultStages = stages.slice(0, limit);

        res.json({
            stages: resultStages,
            hasMore: hasMore,
            totalCount: totalCount
        });
    } catch(err){
        console.error(err);
        res.status(500).send('Error fetching stage list');
    }
};

const getInfo = async (req, res) => {
    const {mode, stage, level, challengeType, challengeDetail, forest, boss, bosses} = req.query;
    
    const { whereClause, queryParams } = buildStageQuery(mode, stage, level, challengeType, challengeDetail, forest, boss, bosses);

    if(!whereClause) return res.status(400).send('Error: Invalid mode or missing parameters.');

    try{
        const data = await Stage.getInfo(whereClause, queryParams);
        if(data){
            res.json({id: data.id, guide: data.guide_json});
        } else {
            res.json({guide: null, id: null});
        }
    } catch(err){
        console.error(err);
        res.status(500).send('Error fetching stage info');
    }
};

const searchStages = async (req, res) => {
    const {mode, stage, level, challengeType, challengeDetail, forest, boss, bosses, ownedIds } = req.body;
    const limit = parseInt(req.query.limit) || DEFAULT_CREWS_PER_PAGE;
    const page = parseInt(req.query.page) || 1;
    const offset = (page-1)*limit;

    const { whereClause, queryParams } = buildStageQuery(mode, stage, level, challengeType, challengeDetail, forest, boss, bosses);

    if(!whereClause) return res.status(400).send('Error: Invalid mode or missing parameters');

    let filterCondition = '';

    if(ownedIds && Array.isArray(ownedIds) && ownedIds.length > 0){
        const paramIndex = queryParams.length + 1;
        filterCondition = `HAVING bool_and(
            cm.character_id = ANY($${paramIndex}::int[])
             OR cm.character_id IS NULL
             OR cm.position = 'Friend Captain'
             OR(cm.notes IS NOT NULL AND LOWER(TRIM(cm.notes))= 'optional'))`;
            queryParams.push(ownedIds);
    }

    try{
        const groupedCrews = await Stage.searchCrews(whereClause, queryParams, filterCondition, limit +1, offset);

        const hasMore = groupedCrews.length > limit;
        const crewsForPage = groupedCrews.slice(0,limit);

        res.json({
            crews: crewsForPage,
            hasMore: hasMore
        });
    } catch (err){
        console.error(err);
        res.status(500).send('Error executing query');
    }
};

module.exports = {getEventNames, getList, getInfo, searchStages};