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
module.exports = groupCrews;