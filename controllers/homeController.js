const Crew = require('../models/Crew');
const GameEvent = require('../models/GameEvent');
const Changelog = require('../models/Changelog');
const Character = require('../models/Character');

const getStats = async(req,res) => {
    try{
        const totalCrews = await Crew.countAll();

        res.json({ totalCrews });
    } catch (err){
        console.error('Error fetching stats:', err);
        res.status(500).json({error: 'Server error'});
    }
};

const getEvents = async(req, res) => {
    try{
        const events = await GameEvent.getAllActive();
        res.json(events);
    } catch (err){
        console.error('Error fetching events:', err);
        res.status(500).json({error: 'Server error'});
    }
};

const getChangelog = async (req, res) => {
    try{
        const logs = await Changelog.getRecent();
        res.json(logs);
    } catch(err){
        console.error('Error fetching changelog:', err);
        res.status(500).json({error: 'Server error'});
    }
};

const getLatestUnit = async (req, res) => {
    try{
        const units = await Character.getLatest();
        res.json(units);
    } catch (err){
        console.error('Error fetching latest units:', err);
        res.status(500).json({error: 'Server error'});
    }
};

module.exports ={ 
    getStats,
    getEvents,
    getChangelog,
    getLatestUnit
};