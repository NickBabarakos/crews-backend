const Banner = require('../models/Banner');
const Character = require('../models/Character');

const getBanners = async (req,res) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page-1)*limit;

    try{
        const banners = await Banner.getActive(limit, offset);
        const totalCount = await Banner.countActive();

        res.json({
            banners,
            hasMore: (offset + banners.length) < totalCount,
            totalCount
        });
    } catch (err){
        console.error('Error fetching banners:', err);
        res.status(500).send('Server Error');
    }
};

const getBannerDetails = async (req, res) => {
    const {id} = req.params;

    try{
        const banner = await Banner.getById(id);

        if(!banner || !banner.data_json){
            return res.status(404).json({error: 'Banner not found'});
        }

        const rawJSON = banner.data_json;
        let allCharIds = [];

        if(rawJSON.categories && Array.isArray(rawJSON.categories)){
            rawJSON.categories.forEach(cat => {
                if(cat.character_ids) allCharIds.push(...cat.character_ids);
            });
        }

        let charMap = {};
        if (allCharIds.length >0){
            const chars = await Character.getByIds(allCharIds);
            chars.forEach(char => { charMap[char.id] = char;});
        }

        const hydratedCategories = rawJSON.categories.map(cat => ({
            ...cat,
            characters: (cat.character_ids || []).map(id => charMap[id]).filter(Boolean)
        }));

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
};

module.exports = {getBanners, getBannerDetails};