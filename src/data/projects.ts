// Projects gallery: one entry per job, with every photo of that job.
// Descriptions and alt text describe only what the photos show. `location` is set only where the
// job's borough is known (the captions from the old site); new photos without a known location
// leave it out rather than guess. Photos 03 and 08 of the old gallery are left out on purpose
// (owner's request); they still appear on the About page.
import type { ImageMetadata } from 'astro';
import p01 from '../assets/projects/project-01.jpg';
import p02 from '../assets/projects/project-02.jpg';
import p04 from '../assets/projects/project-04.jpg';
import p05 from '../assets/projects/project-05.jpg';
import p06 from '../assets/projects/project-06.jpg';
import p07 from '../assets/projects/project-07.jpg';
import p09 from '../assets/projects/project-09.jpg';
import p10 from '../assets/projects/project-10.jpg';
import p11 from '../assets/projects/project-11.jpg';
import p12 from '../assets/projects/project-12.jpg';
import vrf1 from '../assets/projects/vrf-rooftop-1.jpg';
import vrf2 from '../assets/projects/vrf-rooftop-2.jpg';
import vrfPlate from '../assets/projects/vrf-rooftop-nameplate.jpg';
import duct1 from '../assets/projects/commercial-ductwork-1.jpg';
import duct2 from '../assets/projects/commercial-ductwork-2.jpg';
import cassetteService1 from '../assets/projects/ceiling-cassette-service-1.jpg';
import cassetteService2 from '../assets/projects/ceiling-cassette-service-2.jpg';
import cassetteFinished from '../assets/projects/ceiling-cassette-finished.jpg';
import vacuum from '../assets/projects/vacuum-test.jpg';
import backyard from '../assets/projects/mitsubishi-backyard.jpg';
import rtuService from '../assets/projects/rooftop-unit-service.jpg';
import walkIn from '../assets/projects/walk-in-cooler-service.jpg';
import lgRooftop from '../assets/photos/welcome.jpg';
import mitsubishiRooftop from '../assets/photos/service-maintenance.jpg';
import groundCondensers from '../assets/photos/specialty-1.jpg';

/** `position`: CSS object-position for crops (the part of the photo that must stay in view). */
export interface ProjectPhoto { src: ImageMetadata; alt: string; position?: string }
export interface Project { slug: string; title: string; location?: string; description: string; photos: ProjectPhoto[] }

export const projects: Project[] = [
  {
    slug: 'brooklyn-rooftop-condensers', title: 'Rooftop condenser installation', location: 'Brooklyn',
    description: 'A row of new outdoor condensers installed on a flat Brooklyn rooftop, set side by side with room for airflow and service access.',
    photos: [{ src: p01, alt: 'Row of new HVAC condensers on a flat Brooklyn rooftop with the skyline behind' }],
  },
  {
    slug: 'vrf-rooftop-service', title: 'Mitsubishi City Multi VRF service',
    description: 'Commercial HVAC service on a rooftop row of Mitsubishi Electric City Multi VRF outdoor units. Panels are open for electrical testing at the control boards, and the close-up shows an outdoor unit’s nameplate.',
    photos: [
      { src: vrf1, alt: 'Row of Mitsubishi City Multi VRF outdoor units on a commercial rooftop, panels open' },
      { src: vrf2, alt: 'Meter leads on an open VRF control board during rooftop HVAC service' },
      { src: vrfPlate, alt: 'Mitsubishi Electric outdoor unit nameplate on a City Multi VRF condenser' },
    ],
  },
  {
    slug: 'manhattan-rooftop-mini-split', title: 'Rooftop mini-split installation', location: 'Manhattan',
    description: 'Ductless mini-split outdoor units installed on a Manhattan rooftop beside the stair bulkhead, shown with the service panels open during the work and again once complete.',
    photos: [
      { src: p02, alt: 'Two mini-split outdoor units with service panels open beside a Manhattan rooftop bulkhead' },
      { src: p05, alt: 'Completed ductless mini-split outdoor units next to a skylit Manhattan rooftop bulkhead' },
    ],
  },
  {
    slug: 'ceiling-cassette-installation', title: 'Ceiling cassette installation',
    description: 'A ductless ceiling cassette set flush into a finished white ceiling, giving quiet heating and cooling with only the slim grille in view.',
    photos: [{ src: cassetteFinished, alt: 'Ductless ceiling cassette installed flush in a finished white ceiling' }],
  },
  {
    slug: 'brooklyn-gas-furnace', title: 'Carrier gas furnace installation', location: 'Brooklyn',
    description: 'A new Carrier gas furnace installed in a Brooklyn basement, with PVC venting and the supply ductwork connected above the unit.',
    photos: [{ src: p09, alt: 'New Carrier gas furnace with PVC venting installed in a Brooklyn basement' }],
  },
  {
    slug: 'commercial-ductwork', title: 'Commercial ductwork installation',
    description: 'New galvanized sheet-metal ductwork hung below a concrete ceiling during a commercial build-out, including the main trunk line and a curved fitting, installed while the ceiling is still open.',
    photos: [
      { src: duct1, alt: 'New galvanized supply ductwork hung below a concrete ceiling in a commercial build-out' },
      { src: duct2, alt: 'Curved sheet-metal duct fitting and trunk line in an open commercial ceiling' },
    ],
  },
  {
    slug: 'brooklyn-lg-wall-condensers', title: 'Wall-mounted LG condensers', location: 'Brooklyn',
    description: 'Two LG outdoor units mounted side by side on wall brackets in a Brooklyn building, keeping the floor clear and the refrigerant lines neatly run along the wall.',
    photos: [{ src: p04, alt: 'Two LG outdoor condensing units mounted on a wall in a Brooklyn building' }],
  },
  {
    slug: 'mitsubishi-backyard-heat-pump', title: 'Mini-split heat pump outdoor unit',
    description: 'A Mitsubishi Electric mini-split heat pump outdoor unit mounted on wall brackets above a backyard garden, keeping the yard below free.',
    photos: [{ src: backyard, alt: 'Mitsubishi Electric heat pump outdoor unit wall-mounted above a backyard garden' }],
  },
  {
    slug: 'manhattan-daikin-units', title: 'Daikin outdoor unit installation', location: 'Manhattan',
    description: 'Two Daikin outdoor units on wall brackets, with service gauges and an R-410A refrigerant cylinder connected while the system is being charged.',
    photos: [{ src: p06, alt: 'Two Daikin outdoor units on wall brackets with gauges and an R-410A cylinder connected' }],
  },
  {
    slug: 'deep-vacuum-test', title: 'Deep vacuum before startup',
    description: 'Before a new system is charged with refrigerant, the line set is evacuated to remove air and moisture. The micron gauge here reads 286 microns with the vacuum pump running.',
    photos: [{ src: vacuum, alt: 'Fieldpiece micron gauge reading 286 microns while evacuating a new AC line set', position: 'center 88%' }],
  },
  {
    slug: 'brooklyn-spiral-ductwork', title: 'Exposed spiral ductwork', location: 'Brooklyn',
    description: 'Exposed spiral ductwork installed in a finished Brooklyn space, with round branch runs carrying air across the room under the open ceiling.',
    photos: [{ src: p12, alt: 'Exposed spiral ductwork with round branch runs in a finished Brooklyn space' }],
  },
  {
    slug: 'ceiling-cassette-service', title: 'Ceiling cassette service',
    description: 'A ceiling-recessed ductless cassette opened up for service: the grille and filters are lowered and an add-on interface module is being connected to the unit’s control board.',
    photos: [
      { src: cassetteService1, alt: 'Ductless ceiling cassette with front grille and filters lowered for service' },
      { src: cassetteService2, alt: 'Technician connecting an interface module to a ceiling cassette control board' },
    ],
  },
  {
    slug: 'lg-rooftop-condensers', title: 'LG rooftop condenser row',
    description: 'A long row of new LG outdoor condensers on a rooftop, with refrigerant gauges connected to the first unit during the installation.',
    photos: [{ src: lgRooftop, alt: 'Row of new LG outdoor condensers on a rooftop with refrigerant gauges connected' }],
  },
  {
    slug: 'brooklyn-ducted-air-handler', title: 'Concealed ducted air handler', location: 'Brooklyn',
    description: 'A ducted indoor unit installed in a framed ceiling in Brooklyn, hidden above the finished ceiling so only the supply and return grilles will show.',
    photos: [{ src: p11, alt: 'Ceiling-concealed ducted air handler installed in a framed Brooklyn ceiling' }],
  },
  {
    slug: 'rooftop-unit-service', title: 'Rooftop unit service call',
    description: 'A service call on rooftop equipment, with refrigerant gauges connected to a condensing unit next to a packaged rooftop unit to check the system’s pressures.',
    photos: [{ src: rtuService, alt: 'Refrigerant gauges connected to rooftop HVAC units during a service call' }],
  },
  {
    slug: 'manhattan-exhaust-fans', title: 'Rooftop exhaust fans', location: 'Manhattan',
    description: 'Four new rooftop exhaust fans mounted along a Manhattan building’s parapet as part of a ventilation installation.',
    photos: [{ src: p07, alt: 'Four new rooftop exhaust fans installed on a Manhattan parapet wall' }],
  },
  {
    slug: 'mitsubishi-rooftop-units', title: 'Mitsubishi rooftop outdoor units',
    description: 'Several Mitsubishi Electric outdoor units on a city rooftop at sunrise, with larger condensers grouped together and a compact unit in front.',
    photos: [{ src: mitsubishiRooftop, alt: 'Mitsubishi Electric outdoor units on a city rooftop at sunrise' }],
  },
  {
    slug: 'brooklyn-commercial-floor-ductwork', title: 'Open-floor commercial ductwork', location: 'Brooklyn',
    description: 'New overhead ductwork running the length of an open commercial floor in Brooklyn during a build-out, before the space is finished.',
    photos: [{ src: p10, alt: 'New overhead ductwork across an open commercial floor in Brooklyn' }],
  },
  {
    slug: 'ground-mounted-mini-splits', title: 'Ground-mounted mini-split condensers',
    description: 'Two mini-split heat pump outdoor units on raised ground stands beside a house, lifted off the ground for drainage and clear airflow.',
    photos: [{ src: groundCondensers, alt: 'Two mini-split heat pump condensers on raised stands beside a house' }],
  },
  {
    slug: 'walk-in-cooler-service', title: 'Walk-in cooler service',
    description: 'Refrigeration service on a walk-in cooler, which went from 51.4°F before service to 43.3°F after, measured at the evaporator.',
    photos: [{ src: walkIn, alt: 'Walk-in cooler service: evaporator reading 51.4°F before and 43.3°F after', position: 'center 80%' }],
  },
];
