const towns = [
  ['Alphen aan den Rijn', 52.1285, 4.6570],
  ['Gouda',              52.0116, 4.7111],
  ['Woerden',            52.0883, 4.8883],
  ['Bodegraven',         52.0861, 4.7466],
  ['Nieuwkoop',          52.1539, 4.7711],
  ['Waddinxveen',        52.0408, 4.6347],
  ['Montfoort',          52.0524, 4.9433],
  ['Mijdrecht',          52.2067, 4.8639],
  ['Oudewater',          52.0250, 4.8681],
];

const jobTemplates = {
  job_plumber: {
    service: 'Plumbing Services',
    description: 'Plumbers keep the Groene Hart\'s homes, farms and businesses running. From installing new heating systems to fixing leaks on-site, it\'s hands-on work with immediate results — and experienced plumbers are always in demand across the region.',
    names: ['Van der Berg', 'Waterline', 'Kramer', 'River Pipe', 'Blueprint', 'Van Vliet', 'Polderflow', 'Leakfree', 'Lockside'],
    services: ['Installation apprenticeship', 'On-site maintenance', 'Team shadowing day'],
    personas: ['persona_job_seeker', 'persona_returning', 'persona_professional'],
    conditions: ['condition_fulltime', 'condition_flexible', 'condition_remote'],
  },
  job_electrician: {
    service: 'Electrical Services',
    description: 'Electricians are powering the Groene Hart\'s future — from wiring new homes to connecting solar panels and EV chargers. It\'s a skilled trade with excellent career prospects, and apprenticeship routes mean you can earn while you learn.',
    names: ['Green Heart', 'Voltmaster', 'Rhine Works', 'Sparks', 'The Switch', 'Power Circle', 'Lightpoint', 'Cable Yard', 'PolderNet'],
    services: ['Electrical apprenticeship', 'Fault response training', 'Safety certificate support'],
    personas: ['persona_student', 'persona_job_seeker', 'persona_professional'],
    conditions: ['condition_fulltime', 'condition_flexible'],
  },
  job_carpenter: {
    service: 'Construction and Carpentry',
    description: 'Carpenters and construction workers are shaping the Groene Hart\'s built environment — renovating historic farmhouses, building new social housing, and crafting custom interiors. Creative, physical, and always producing something you can point to with pride.',
    names: ['Timber Yard', 'Van Leeuwen', 'The Beam', 'Greenwood', 'Rhine Build', 'Craft House', 'Plot and Frame', 'Masterwork', 'Polder Build'],
    services: ['Practical internship', 'Workshop coaching', 'Renovation projects'],
    personas: ['persona_job_seeker', 'persona_student', 'persona_returning'],
    conditions: ['condition_fulltime', 'condition_parttime'],
  },
  job_catering: {
    service: 'Hospitality',
    description: 'From polder-side restaurants to care home kitchens and event venues, the Groene Hart\'s hospitality sector has a place for every skill level. Flexible shifts make this a great entry point into the workforce or a reliable complement to other work.',
    names: ['Market Kitchen', 'Heartfelt', 'Polder Taste', 'Lunch Bridge', 'Quayside Catering', 'Rhine View', 'Training Bistro', 'Regional Table', 'Compass'],
    services: ['Kitchen assistant training', 'Hospitality coaching', 'Flexible shifts'],
    personas: ['persona_student', 'persona_returning', 'persona_job_seeker'],
    conditions: ['condition_parttime', 'condition_flexible', 'condition_remote'],
  },
  job_healthcare: {
    service: 'Care Group',
    description: 'Care workers make a real difference to people\'s daily lives across the region. Whether supporting elderly residents at home or working in a care facility, these roles offer meaningful, stable employment — and the Groene Hart\'s ageing population means demand is only growing.',
    names: ['Village Support', 'Home at Heart', 'Rhine Meadow', 'Helping Hand', 'Compass Network', 'Polder Help', 'People Plus', 'Heartline', 'Stronger Together'],
    services: ['Care assistant placement', 'Client support training', 'Basic care certificate'],
    personas: ['persona_returning', 'persona_job_seeker', 'persona_professional'],
    conditions: ['condition_parttime', 'condition_flexible', 'condition_remote'],
  },
  job_it: {
    service: 'Digital',
    description: 'Digital skills are needed everywhere in the Groene Hart — from local businesses moving online to agricultural tech and smart infrastructure. Roles range from helpdesk support to web development, and many positions welcome career changers with no formal IT background.',
    names: ['Code Quay', 'Rhine Bits', 'Green Cloud', 'Data Yard', 'Support Point', 'Webmakers', 'PolderTech', 'Start IT', 'Network House'],
    services: ['Helpdesk traineeship', 'Web development basics', 'Digital skills coaching'],
    personas: ['persona_student', 'persona_professional', 'persona_job_seeker'],
    conditions: ['condition_fulltime', 'condition_parttime', 'condition_remote'],
  },
  job_admin: {
    service: 'Administration',
    description: 'Every organisation in the Groene Hart runs on good administration. From scheduling and planning to customer contact and financial records, office professionals keep things moving — and part-time and flexible options make this sector accessible to almost anyone.',
    names: ['Books and Balance', 'Rhine Office', 'Polder Support', 'Records Room', 'Numbers and Co', 'Green Heart Desk', 'Planning Bureau Plus', 'Office Opportunity', 'Form Works'],
    services: ['Back-office placement', 'Customer contact training', 'Planning and records'],
    personas: ['persona_returning', 'persona_professional', 'persona_employer'],
    conditions: ['condition_parttime', 'condition_fulltime', 'condition_remote'],
  },
  job_driver: {
    service: 'Logistics',
    description: 'Drivers and logistics workers are the backbone of the Groene Hart\'s supply chains — connecting farms, warehouses and businesses across the region. With support to earn your licence and a variety of route types, it\'s a role that rewards reliability and independence.',
    names: ['Rhine Route', 'Polder Courier', 'Heart Transport', 'Loading Point', 'Bodegraven Delivery', 'RoutePlus', 'Green Heart Distribution', 'Roadwise', 'Rhine Freight'],
    services: ['Driving licence support', 'Warehouse and planning', 'Delivery route training'],
    personas: ['persona_job_seeker', 'persona_employer', 'persona_returning'],
    conditions: ['condition_fulltime', 'condition_flexible', 'condition_parttime'],
  },
};

// Each job type gets a small compass-point offset so professions fan out around each town
// while staying inside the Groene Hart boundary.
const jobSpread = [
  [ 0.010,  0.000],  // N
  [ 0.007,  0.012],  // NE
  [ 0.000,  0.014],  // E
  [-0.007,  0.012],  // SE
  [-0.010,  0.000],  // S
  [-0.007, -0.012],  // SW
  [ 0.000, -0.014],  // W
  [ 0.007, -0.012],  // NW
];

export const locations = Object.entries(jobTemplates).flatMap(([jobId, template], jobIndex) =>
  towns.map(([town, lat, lng], townIndex) => {
    const [dLat, dLng] = jobSpread[jobIndex] ?? [0, 0];
    return {
      id: `${jobId}_${townIndex + 1}`,
      name: `${template.names[townIndex]} ${template.service}`,
      town,
      lat: lat + dLat,
      lng: lng + dLng,
    description: template.description,
    services: template.services,
    hours: template.conditions[townIndex % template.conditions.length] === 'condition_parttime'
      ? 'Part-time'
      : template.conditions[townIndex % template.conditions.length] === 'condition_flexible'
        ? 'Flexible'
        : 'Full-time',
    relevant_job_types: [jobId],
    relevant_personas: template.personas,
    relevant_conditions: template.conditions,
    };
  })
);

export function getMatchedLocations(cardIds) {
  if (cardIds.length === 0) return [];
  const selected = new Set(cardIds);
  const selectedJobs = [...selected].filter((id) => id.startsWith('job_'));
  const selectedPersonas = [...selected].filter((id) => id.startsWith('persona_'));
  const selectedConditions = [...selected].filter((id) => id.startsWith('condition_'));
  const hasLocationDrivingCard = selectedJobs.length > 0 || selectedConditions.length > 0;
  if (!hasLocationDrivingCard) return [];
  return locations
    .map((location) => {
      const jobMatch = selectedJobs.length === 0 || location.relevant_job_types.some((id) => selected.has(id));
      const personaMatch = selectedPersonas.length === 0 || location.relevant_personas.some((id) => selected.has(id));
      const conditionMatch = selectedConditions.length === 0
        || selectedConditions.some((id) => locationMatchesCondition(location, id));
      const baseMatch = jobMatch && personaMatch && conditionMatch;
      const conditionScore = location.relevant_conditions.filter((id) => selected.has(id)).length;
      const jobScore = location.relevant_job_types.filter((id) => selected.has(id)).length;
      const personaScore = location.relevant_personas.filter((id) => selected.has(id)).length;
      const situationScore = [...selected].filter((id) => id.startsWith('situation_')).length ? 0.25 : 0;
      return { ...location, matchScore: baseMatch ? 1 + jobScore + personaScore + conditionScore + situationScore : 0 };
    })
    .filter((location) => location.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.town.localeCompare(b.town));
}

function locationMatchesCondition(location, conditionId) {
  if (conditionId === 'condition_fulltime') return location.hours === 'Full-time';
  if (conditionId === 'condition_parttime') return location.hours === 'Part-time';
  if (conditionId === 'condition_flexible') return location.hours === 'Flexible';
  return location.relevant_conditions.includes(conditionId);
}
