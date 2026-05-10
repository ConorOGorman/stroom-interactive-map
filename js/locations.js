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
    service: 'Loodgieterij',
    names: ['Van der Berg', 'De Waterlijn', 'Kramer', 'Rijn en Pijp', 'Blauwdruk', 'Van Vliet', 'Polderflow', 'Lekvrij', 'Sluiskade'],
    services: ['Installatieleerplek', 'Onderhoud op locatie', 'Meeloopdag met vakteam'],
    personas: ['persona_job_seeker', 'persona_returning', 'persona_professional'],
    conditions: ['condition_fulltime', 'condition_flexible', 'condition_remote'],
  },
  job_electrician: {
    service: 'Elektra B.V.',
    names: ['Groene Hart', 'Voltmeester', 'Rijnland', 'Vonken', 'De Schakel', 'Stroomkring', 'Lichtpunt', 'Kabelhof', 'PolderNet'],
    services: ['BBL-traject elektrotechniek', 'Storingsdienst training', 'Veilig werken certificaat'],
    personas: ['persona_student', 'persona_job_seeker', 'persona_professional'],
    conditions: ['condition_fulltime', 'condition_flexible'],
  },
  job_carpenter: {
    service: 'Bouw & Timmerwerk',
    names: ['Houtwerf', 'Van Leeuwen', 'De Balk', 'Groenhout', 'Rijnbouw', 'Ambachtshuis', 'Kavel & Kozijn', 'Meesterwerk', 'Polderbouw'],
    services: ['Praktijkstage', 'Werkplaatsbegeleiding', 'Renovatieprojecten'],
    personas: ['persona_job_seeker', 'persona_student', 'persona_returning'],
    conditions: ['condition_fulltime', 'condition_parttime'],
  },
  job_catering: {
    service: 'Horeca',
    names: ['De Marktkeuken', 'Hartelijk', 'Polderproef', 'De Lunchbrug', 'Kade Catering', 'Rijnzicht', 'Bistro Leerwerk', 'Streektafel', 'Kompas'],
    services: ['Keukenassistent training', 'Gastvrijheid coaching', 'Flexibele diensten'],
    personas: ['persona_student', 'persona_returning', 'persona_job_seeker'],
    conditions: ['condition_parttime', 'condition_flexible', 'condition_remote'],
  },
  job_healthcare: {
    service: 'Zorggroep',
    names: ['Zorgbrug', 'Thuis in Hart', 'Rijnweide', 'De Helpende Hand', 'Kompas Zorg', 'Polderzorg', 'Mens en Meer', 'Hartlijn', 'Samen Sterk'],
    services: ['Zorgassistent leerplek', 'Clientbegeleiding', 'Certificaat basiszorg'],
    personas: ['persona_returning', 'persona_job_seeker', 'persona_professional'],
    conditions: ['condition_parttime', 'condition_flexible', 'condition_remote'],
  },
  job_it: {
    service: 'Digital',
    names: ['Codekade', 'Rijnbits', 'Groene Cloud', 'Datawerf', 'Supportpunt', 'Webmakers', 'PolderTech', 'Start IT', 'Netwerkhuis'],
    services: ['Helpdesk traineeship', 'Web development basis', 'Digitale vaardigheden'],
    personas: ['persona_student', 'persona_professional', 'persona_job_seeker'],
    conditions: ['condition_fulltime', 'condition_parttime', 'condition_remote'],
  },
  job_admin: {
    service: 'Administratie',
    names: ['Boek & Balans', 'Rijn Office', 'PolderSupport', 'De Dossierkamer', 'Cijfers & Co', 'Loket Groene Hart', 'Planbureau Plus', 'KantoorKans', 'Formulierwerk'],
    services: ['Backoffice leerwerkplek', 'Klantcontact training', 'Planning en dossiers'],
    personas: ['persona_returning', 'persona_professional', 'persona_employer'],
    conditions: ['condition_parttime', 'condition_fulltime', 'condition_remote'],
  },
  job_driver: {
    service: 'Logistiek',
    names: ['RijnRoute', 'Polderkoerier', 'Hart Transport', 'De Laadplaats', 'Bodegraafse Bezorgers', 'RoutePlus', 'Groene Hart Distributie', 'Wegwijs', 'StreekLogistiek'],
    services: ['Rijbewijs begeleiding', 'Magazijn en planning', 'Bezorgroute training'],
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
