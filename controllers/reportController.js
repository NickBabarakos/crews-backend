const Report = require('../models/Report');

const submitReport = async(req, res) => {
    const {crew_id, message} = req.body;

    if(!crew_id || !message){
        return res.status(400).json({error: 'Crew ID and message are required'});
    }

    try{
        await Report.create(crew_id, message);
        res.json({success: true, message: 'Report submitted successfully'});
    } catch (err) {
        console.error('Submit Report Error:', err);
        res.status(500).json({error: 'Failed to submit report'});
    }
};

module.exports = { submitReport };