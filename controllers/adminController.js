const Character = require('../models/Character');
const Creator = require('../models/Creator');
const Crew = require('../models/Crew');
const PendingCrew = require('../models/PendingCrew');
const Report = require('../models/Report');
const Banner = require('../models/Banner');
const GameEvent = require('../models/GameEvent');

const addCharacter = async(req,res) => {
    const {id, name, info_url, type} = req.body;
    if(!id || !name || !info_url || !type) return res.status(400).json({error: 'All fields required'});

    const image_url = `/unit_icons/${id}`;

    try{
        const exists = await Character.exists(id);
        if(exists) return res.status(409).json({error: `Character ${id} exists`});

        const newChar = await Character.create({id, name, info_url, image_url, type});
        res.json({success: true, message: `Character ${name} added`, character: newChar});
    } catch(err){
        console.error('Admin Insert Error:', err);
        res.status(500).json({error: 'Database error'});
    }
};

const checkCreator = async(req, res) => {
    const {social_url, public_key} = req.body;
    try{
        let creator;
        if(public_key) creator = await Creator.findByPublicKey(public_key);
        else if(social_url) creator = await Creator.findBySocialUrl(social_url);

        res.json({exists: !!creator, creator: creator || undefined});
    } catch (err){
        res.status(500).json({error: 'Database error'});
    }
};

const createCreator = async(req, res) => {
    const {name, social_url, public_key} = req.body;
    if(!name || (!social_url && !public_key)) return res.status(400).json({error: 'Missing fields'});
    
    try{
        const newCreator = await Creator.create(name, social_url, public_key);
        res.json({success: true, message: 'Creator created', creator: newCreator});
    } catch (err){
        res.status(500).json({error: 'Failed to create creator'});
    }
};

const createCrew = async(req,res) => {
    const { title, stage_id, video_url, creator_id, guide_type, text_guide, members} = req.body;
    if(!title || !stage_id || !creator_id || !guide_type) return res.status(400).json({error: 'Missing fields'});

    try{
        const crewId = await Crew.createFullCrew(
            {title, stage_id, video_url, creator_id, guide_type, text_guide},
            members 
        ); 
        res.json({success: true, message: 'Crew created successfully', crewId});
    } catch(err){
        console.error('Create Crew Error', err);
        res.status(500).json({error: 'Transaction Failed'});
    }
};

const deleteCrew = async(req, res) => {
    const {id} = req.params;
    try{
        const deleted = await Crew.delete(id);
        if(!deleted) return res.status(404).json({error: 'Crew not found'});
        res.json({success: true, message: `Crew ${id} deleted`});
    } catch (err){
        res.status(500).json({error: err.message});
    }
};

const createBanner = async(req, res) => {
    const {title, image_url, start_date, end_date, data_json} = req.body;
    if(!title) return res.status(400).json({error: 'Fields required'});

    try{
        const finalJson = typeof data_json === 'string' ? JSON.parse(data_json) : data_json;
        const banner = await Banner.create(title, image_url, start_date, end_date, finalJson);
        res.json({success: true, message: 'Banner created', bannerId: banner.id});
    } catch (err){
        res.status(500).json({error: 'Failed to create banner'});
    }
};

const updateEventContent = async(req,res) => {
    const {mode, data} = req.body;
    try{
        await GameEvent.rotateContent(mode, data);
        res.json({success: true, message: 'Event content rotated successfully'});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
};

const getPendingCrews = async(req,res) => {
    try{
        const crews = await PendingCrew.getAll();
        res.json(crews);
    } catch(err){
        console.error('Fetch Pending Crews Error', err);
        res.status(500).json({error: 'Failed to fetch pending crews'});
    }
};

const deletePendingCrew = async(req, res) => {
    const {id} = req.params;
        try{
            await PendingCrew.delete(id);
            res.json({success: true, message: 'Pending crew deleted'});
        } catch(err){
            res.status(500).json({error: 'Failed to delete pending crew'});
        }
};

const getReports = async(req, res) => {
    try{
        const reports = await Report.getAll();
        res.json(reports);
    } catch (err){
        res.status(500).json({error: 'Failed to fetch reports'});
    }
}

const deleteReport = async(req, res) => {
    const {id} = req.params;
    try{
        await Report.delete(id);
        res.json({success: true, message: 'Report deleted'});
    } catch(err){
        res.status(500).json({error: 'Failed to delete report'});
    }
};

module.exports = {
    addCharacter,
    checkCreator, createCreator,
    createCrew, deleteCrew,
    createBanner, updateEventContent,
    getPendingCrews, deletePendingCrew,
    getReports, deleteReport
};