const Crew = require('../models/Crew');
const PendingCrew = require('../models/PendingCrew');

const getCrewContext = async (req,res) => {
    const {id} = req.params;
    try{
        const crewData = await Crew.getContext(id);

        if(!crewData){
            return res.status(404).json({error: 'Crew not found'});
        }

        const rank = await Crew.getRank(crewData.stage_id, id);

        res.json({
            ...crewData,
            rank: rank
        });
    } catch (err){
        console.error(err);
        res.status(500).send('Server Error fetching crew context');
    }
};

const submitCrew = async (req, res) => {
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
            const pendingId = await PendingCrew.submit({
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
            });

            res.json({
                success: true,
                message: 'Your crew has been submitted and is pending approval!',
                pendingId: pendingId
            });
        } catch (err){
            console.error('Error submitting crew:', err);
            res.status(500).json({error: 'Internal Server Error during submission'});
        }
};

module.exports = {getCrewContext, submitCrew};