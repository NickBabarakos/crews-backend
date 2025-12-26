const crypto = require('crypto');

const generateKey = (prefix) => {
    return `${prefix}-${crypto.randomBytes(4).toString('hex')}-${crypto.randomBytes(4).toString('hex')}`;
};

function groupCrews(flatResults){
    const crewMap = new Map();

    for(const row of flatResults){

        if (!crewMap.has(row.crew_id)){
            crewMap.set(row.crew_id, {
                id: row.crew_id,
                title: row.crew_title,
                stage_name: row.stage_name,
                video_url: row.video_url,
                guide_type: row.guide_type,
                text_guide: row.text_guide,
                creator_name: row.creator_name,
                members: []
            });
        } 
    const currentCrew = crewMap.get(row.crew_id);

    currentCrew.members.push({
        character_id: row.character_id,
        name: row.character_name,
        position: row.position,
        image_url: row.image_url,
        info_url: row.info_url,
        type: row.type,
        notes: row.notes
    });
    }
    return Array.from(crewMap.values());
}

function buildStageQuery(mode, stage, level, challengeType, challengeDetail, forest, boss, bosses) {
    let whereClause = '';
    let queryParams = [];

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
                whereClause = 'WHERE stages.mode=$1 AND stages.level = $2 AND stages.name = $3';
                queryParams = ['pirate_king_adventures', level, bosses];
                break;

            default:
                return {whereClause: null, queryParams: null};
    }
    return {whereClause, queryParams};
}

module.exports = {generateKey, groupCrews, buildStageQuery };