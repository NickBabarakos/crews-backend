const UserBox = require('../models/UserBox');
const { generateKey } = require('../utils/helpers');

const createBox = async(req, res) => {
    const {initialData, favorites} = req.body;
    const publicKey = generateKey('pub');
    const secretKey = generateKey('sec');

    try{
        const dataToSave = initialData || {};
        const favsToSave = favorites || [];

        const newBox = await UserBox.create(publicKey, secretKey, dataToSave, favsToSave);

        res.json({ success: true, publicKey: newBox.public_key, secretKey: newBox.secret_key});
    } catch (err){
        console.error('Error creating box:', err);
        res.status(500).json({error: 'Failed to create box'});
    }
};

const updateBox = async(req,res) => {
    const { secretKey, boxData, favorites} = req.body;

    if(!secretKey) return res.status(401).json({error: 'Secret key required'});

    try{
        const updated = await UserBox.update(secretKey, boxData, favorites || []);

        if(!updated){
            return res.status(403).json({error: 'Invalid secret key'});
        }

        res.json({success: true});
    } catch (err){
        console.error('Error updating box:', err);
        res.status(500).json({error: 'Failed to update box'});
    }
};

const restoreBox = async(req, res) => {
    const { secretKey } = req.body;

    try{
        const box = await UserBox.findBySecretKey(secretKey);

        if(!box){
            return res.status(404).json({error: 'Box not found'});
        }

        res.json({
            success: true,
            publicKey: box.public_key,
            boxData: box.box_data,
            favorites: box.favorites || []
        });
    } catch (err){
        console.error('Error restoring box:', err);
        res.status(500).json({error: 'Server error'});
    }
};

const viewBox = async(req,res) => {
    const { publicKey } = req.params;

    try{
        const box = await UserBox.getDataByPublic(publicKey);

        if(!box){
            return res.status(404).json({error: 'Box not found'});
        }

        res.json({boxData: box.box_data});
    } catch (err){
        console.error('Error viewing box:', err);
        res.status(500).json({error: 'Server error'});
    }
};

module.exports = {createBox, updateBox, restoreBox, viewBox};