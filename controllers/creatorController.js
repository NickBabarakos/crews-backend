const Creator = require('../models/Creator');
const UserBox = require('../models/UserBox');

const getLeaderboard = async (req,res) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page-1)*limit;

    try{
        const creators = await Creator.getLeaderboard(limit, offset);
        const totalCount = await Creator.countLeaderboard();
        const hasMore = (offset + creators.length) < totalCount;

        res.json({
            creators,
            hasMore,
            totalCount
        });
    } catch(err){
        console.error('Error fetching creators:', err);
        res.status(500).send('Server Error');
    }
};

const verifyHandle = async (req,res) => {
    const {social_url} = req.body;
    if(!social_url) return res.status(400).json({error: 'URL required'});

    try{
        const creator = await Creator.findBySocialUrl(social_url);
        if(creator){
            res.json({status: 'FOUND', creator});
        } else{
            res.json({status: 'NOT_FOUND'});
        }
    } catch (err){
        console.error('verify Handle Error', err);
        res.status(500).json({error: 'Server check failed'});
    }
};

const verifyKey = async (req, res) => {
    const {public_key } = req.body;

    if(!public_key) return res.status(400).json({error: 'Key required'});

    try{
        const creator = await Creator.findByPublicKey(public_key);
        if(creator){
            return res.json({status: 'CREATOR_FOUND', creator});
        }

        const box = await UserBox.findByPublicKey(public_key);
        if(box){
            return res.json({status: 'VALID_KEY_NO_CREATOR'});
        } else {
            return res.json({status: 'INVALID_KEY'});
        }
    } catch (err){
        console.error('Verify Key Error', err);
        res.status(500).json({error: 'Server check failed'});
    }
};

const checkName = async(req,res) => {
    try{
        const result = await Creator.findByName(req.params.name);
        res.json({exists: !!result});
    } catch (err){
        res.status(500).json({error: 'Server error checking the name'});
    }
};

module.exports = {getLeaderboard, verifyHandle, verifyKey, checkName};