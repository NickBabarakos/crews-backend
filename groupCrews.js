function groupCrews(results){
    const crewMap = {};

    for(const row of results){

        if(!crewMap[row.crew_id]){
            crewMap[row.crew_id] = {
                id: row.crew_id,
                title: row.crew_title,
                video_url: row.video_url,
                members: []
            };
        }

        crewMap[row.crew_id].members.push({
            character_id: row.character_id,
            name: row.character_name,
            position: row.position,
            image_url: row.image_ulr,
            info_url: row.info_url,
            shop: row.shop,
            required_level: row.required_level
    });

   
        
    }
     return Object.values(crewMap);
}

module.exports = groupCrews;