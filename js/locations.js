const towns = [
  ['Alphen aan den Rijn', 35, 29],
  ['Gouda', 52, 73],
  ['Woerden', 67, 42],
  ['Bodegraven', 54, 48],
  ['Nieuwkoop', 30, 38],
  ['Waddinxveen', 48, 62],
  ['Zoetermeer', 38, 82],
  ['Boskoop', 43, 52],
  ['Hazerswoude', 37, 47],
];

const jobTemplates = {
  job_plumber: {
    service: 'Plumbing Services',
    names: ['Van der Berg', 'Waterline', 'Kramer', 'River Pipe', 'Blueprint', 'Van Vliet', 'Polderflow', 'Leakfree', 'Lockside'],
    services: ['Installation apprenticeship', 'On-site maintenance', 'Team shadowing day'],
    personas: ['persona_job_seeker', 'persona_returning', 'persona_professional'],
    conditions: ['condition_fulltime', 'condition_flexible', 'condition_remote'],
  },
  job_electrician: {
    service: 'Electrical Services',
    names: ['Green Heart', 'Voltmaster', 'Rhine Works', 'Sparks', 'The Switch', 'Power Circle', 'Lightpoint', 'Cable Yard', 'PolderNet'],
    services: ['Electrical apprenticeship', 'Fault response training', 'Safety certificate support'],
    personas: ['persona_student', 'persona_job_seeker', 'persona_professional'],
    conditions: ['condition_fulltime', 'condition_flexible'],
  },
  job_carpenter: {
    service: 'Construction and Carpentry',
    names: ['Timber Yard', 'Van Leeuwen', 'The Beam', 'Greenwood', 'Rhine Build', 'Craft House', 'Plot and Frame', 'Masterwork', 'Polder Build'],
    services: ['Practical internship', 'Workshop coaching', 'Renovation projects'],
    personas: ['persona_job_seeker', 'persona_student', 'persona_returning'],
    conditions: ['condition_fulltime', 'condition_parttime'],
  },
  job_catering: {
    service: 'Hospitality',
    names: ['Market Kitchen', 'Heartfelt', 'Polder Taste', 'Lunch Bridge', 'Quayside Catering', 'Rhine View', 'Training Bistro', 'Regional Table', 'Compass'],
    services: ['Kitchen assistant training', 'Hospitality coaching', 'Flexible shifts'],
    personas: ['persona_student', 'persona_returning', 'persona_job_seeker'],
    conditions: ['condition_parttime', 'condition_flexible', 'condition_remote'],
  },
  job_healthcare: {
    service: 'Care Group',
    names: ['Care Bridge', 'Home at Heart', 'Rhine Meadow', 'Helping Hand', 'Compass Care', 'Polder Care', 'People Plus', 'Heartline', 'Stronger Together'],
    services: ['Care assistant placement', 'Client support training', 'Basic care certificate'],
    personas: ['persona_returning', 'persona_job_seeker', 'persona_professional'],
    conditions: ['condition_parttime', 'condition_flexible', 'condition_remote'],
  },
  job_it: {
    service: 'Digital',
    names: ['Code Quay', 'Rhine Bits', 'Green Cloud', 'Data Yard', 'Support Point', 'Webmakers', 'PolderTech', 'Start IT', 'Network House'],
    services: ['Helpdesk traineeship', 'Web development basics', 'Digital skills coaching'],
    personas: ['persona_student', 'persona_professional', 'persona_job_seeker'],
    conditions: ['condition_fulltime', 'condition_parttime', 'condition_remote'],
  },
  job_admin: {
    service: 'Administration',
    names: ['Books and Balance', 'Rhine Office', 'Polder Support', 'Records Room', 'Numbers and Co', 'Green Heart Desk', 'Planning Bureau Plus', 'Office Opportunity', 'Form Works'],
    services: ['Back-office placement', 'Customer contact training', 'Planning and records'],
    personas: ['persona_returning', 'persona_professional', 'persona_employer'],
    conditions: ['condition_parttime', 'condition_fulltime', 'condition_remote'],
  },
  job_driver: {
    service: 'Logistics',
    names: ['Rhine Route', 'Polder Courier', 'Heart Transport', 'Loading Point', 'Bodegraven Delivery', 'RoutePlus', 'Green Heart Distribution', 'Roadwise', 'Regional Logistics'],
    services: ['Driving licence support', 'Warehouse and planning', 'Delivery route training'],
    personas: ['persona_job_seeker', 'persona_employer', 'persona_returning'],
    conditions: ['condition_fulltime', 'condition_flexible', 'condition_parttime'],
  },
};

export const locations = Object.entries(jobTemplates).flatMap(([jobId, template], jobIndex) =>
  towns.map(([town, baseX, baseY], townIndex) => ({
    id: `${jobId}_${townIndex + 1}`,
    name: `${template.names[townIndex]} ${template.service}`,
    town,
    svgX: Math.max(8, Math.min(92, baseX + ((jobIndex % 4) - 1.5) * 3 + (townIndex % 3) * 1.2)),
    svgY: Math.max(10, Math.min(90, baseY + (Math.floor(jobIndex / 4) - 0.5) * 4 + ((townIndex % 2) ? 1.8 : -1.8))),
    services: template.services,
    hours: template.conditions[townIndex % template.conditions.length] === 'condition_parttime'
      ? 'Part-time'
      : template.conditions[townIndex % template.conditions.length] === 'condition_flexible'
        ? 'Flexible'
        : 'Full-time',
    relevant_job_types: [jobId],
    relevant_personas: template.personas,
    relevant_conditions: template.conditions,
  }))
);

export function getMatchedLocations(cardIds) {
  const selected = new Set(cardIds);
  return locations
    .map((location) => {
      const baseMatch = location.relevant_job_types.some((id) => selected.has(id))
        || location.relevant_personas.some((id) => selected.has(id));
      const conditionScore = location.relevant_conditions.filter((id) => selected.has(id)).length;
      const situationScore = [...selected].filter((id) => id.startsWith('situation_')).length ? 0.25 : 0;
      return { ...location, matchScore: baseMatch ? 1 + conditionScore + situationScore : 0 };
    })
    .filter((location) => location.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.town.localeCompare(b.town));
}
