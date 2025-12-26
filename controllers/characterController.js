const Character = require('../models/Character');

const CHARACTERS_PER_PAGE = 60;

const getCharacters = async (req,res) => {
    const limit = parseInt(req.query.limit) || CHARACTERS_PER_PAGE;
    const {type, search} = req.query;
    const page = parseInt (req.query.page) || 1;
    const offset = (page-1)*limit;

    if(!type){
        return res.status(400).send('The parameter "type" is mandatory');
    }

    try{
        const {characters, totalCount } = await Character.search(type, search, limit + 1, offset);

        const hasMore = characters.length > limit;
        const charactersForPage = characters.slice(0, limit);

        res.json({
            characters: charactersForPage,
            hasMore: hasMore,
            totalCount: totalCount
        });
    } catch(err){
        console.error('Error fetching characters:', err);
        res.status(500).send('Server Error');
    }
};

const getAllIds = async(req, res) => {
    try{
        const ids = await Character.getAllIds();
        res.json(ids);
    } catch (err){
        console.error('Error fetching all ids:', err);
        res.status(500).send('Server Error');
    }
};

module.exports = {getCharacters, getAllIds};