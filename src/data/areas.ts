// Service-area landing pages (/areas/<slug>/). Each page needs its own, genuinely local content:
// the building types, the heating and cooling systems they usually have, and local questions.
// Keep claims general and true; do not add job counts or response times that are not confirmed.
import type { Faq } from './faq';

export interface AreaBuilding { title: string; text: string }
export interface Area {
  slug: string;
  name: string;
  /** "in Brooklyn", "on Long Island", "in Westchester County" */
  inName: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  neighborhoods: string[];
  intro: string[];
  buildings: AreaBuilding[];
  faq: Faq[];
  home?: boolean;
}

export const areas: Area[] = [
  {
    slug: 'brooklyn',
    name: 'Brooklyn',
    inName: 'in Brooklyn',
    home: true,
    title: 'HVAC Services in Brooklyn, NY | Mode Mechanical',
    description: 'Brooklyn HVAC contractor for AC repair, heating, ductless mini-splits and heat pumps in brownstones, co-ops and storefronts. Call (914) 223-3301.',
    h1: 'HVAC Installation and Repair in Brooklyn, NY',
    lede: 'Our home base. Heating and cooling for brownstones, co-ops, new condos and storefronts across the borough.',
    neighborhoods: ['Park Slope', 'Bed-Stuy', 'Williamsburg', 'Greenpoint', 'Fort Greene', 'Clinton Hill', 'Crown Heights', 'Prospect Heights', 'Bushwick', 'Bay Ridge', 'Sunset Park', 'Flatbush'],
    intro: [
      'Mode Mechanical is based in Brooklyn, and most of our work happens here — from a single ductless unit in a top-floor walk-up to rooftop condensers for a mixed-use building.',
      'Brooklyn’s housing stock is unusually varied, so the right system depends on the building. Before we quote, we look at how the space is heated today, where an outdoor unit can legally and practically go, and how refrigerant lines or ducts can be routed without tearing up original details.',
    ],
    buildings: [
      { title: 'Brownstones and row houses', text: 'Most were built without ductwork and heat with a boiler and radiators. Ductless mini-splits or small-duct systems add cooling (and efficient heat) floor by floor, with condensers on the roof or in the rear yard.' },
      { title: 'Pre-war co-ops and walk-ups', text: 'Window units and through-wall sleeves are common. Boards usually want to approve outdoor unit placement first, so we plan the installation around the building’s rules.' },
      { title: 'New condos and conversions', text: 'Newer buildings often use VRF systems, heat pumps or fan coils. We service, repair and replace these systems and their controls.' },
      { title: 'Storefronts and restaurants', text: 'Rooftop units, split systems and ventilation for retail, offices and food service — with work scheduled to keep your business open.' },
    ],
    faq: [
      { q: 'Can you add air conditioning to a brownstone with no ductwork?', a: 'Yes. Ductless mini-splits are the usual answer: small indoor heads in each room, slim refrigerant lines run through closets or along the exterior, and an outdoor condenser on the roof or in the yard. They heat as well as cool, so they can also take load off an old boiler.' },
      { q: 'Do I need co-op or condo board approval for a new system?', a: 'Usually, yes. Most boards want to approve where the outdoor unit goes and see the contractor’s paperwork before work starts. Tell us early and we’ll plan the installation around the board’s requirements.' },
    ],
  },
  {
    slug: 'queens',
    name: 'Queens',
    inName: 'in Queens',
    title: 'HVAC Services in Queens, NY | Mode Mechanical',
    description: 'AC repair, furnace and boiler service, central air and ductless installation in Queens — from Astoria to Bayside. Licensed HVAC. Call (914) 223-3301.',
    h1: 'Heating and Air Conditioning Service in Queens, NY',
    lede: 'Central air, furnaces, boilers and ductless systems for houses, two-family homes and apartment buildings across Queens.',
    neighborhoods: ['Astoria', 'Long Island City', 'Sunnyside', 'Woodside', 'Jackson Heights', 'Forest Hills', 'Rego Park', 'Flushing', 'Bayside', 'Ridgewood', 'Jamaica', 'Kew Gardens'],
    intro: [
      'Queens has more single- and two-family houses than any other borough, which means more furnaces, central air systems and attic or basement ductwork — alongside the high-rises of Long Island City and the apartment buildings of Jackson Heights and Rego Park.',
      'Whether you need a repair on a 20-year-old furnace or are weighing a full replacement, we start by checking the whole system — equipment, ductwork and controls — so you only pay for what actually fixes the problem.',
    ],
    buildings: [
      { title: 'Detached and semi-detached houses', text: 'Forced-air furnaces with central air are typical in Bayside, Forest Hills and Flushing. We repair, tune up and replace both, and size new equipment to the house rather than the old unit.' },
      { title: 'Two-family homes', text: 'Separate systems or zoning let each unit control its own temperature and pay its own bills. Ductless systems are a clean option where ducts can’t be added.' },
      { title: 'Boiler-heated homes', text: 'Many Astoria, Sunnyside and Ridgewood homes heat with hot-water or steam boilers. We service them and add ductless cooling without disturbing the radiators.' },
      { title: 'High-rise apartments and condos', text: 'Long Island City buildings often use fan coils, PTACs or VRF. We work within building rules on access and scheduling.' },
    ],
    faq: [
      { q: 'Should I replace my furnace and air conditioner at the same time?', a: 'If both are near the end of their life, replacing them together usually costs less overall and gives you a matched, more efficient system. If one is newer, it can often stay. We’ll show you the condition of each before you decide.' },
      { q: 'Can each apartment in a two-family house have its own controls?', a: 'Yes. Either separate systems or a zoned system with its own thermostat per floor lets each household set its own temperature. Ductless mini-splits make this straightforward where there is no ductwork.' },
    ],
  },
  {
    slug: 'manhattan',
    name: 'Manhattan',
    inName: 'in Manhattan',
    title: 'HVAC Services in Manhattan, NYC | Mode Mechanical',
    description: 'HVAC repair and installation in Manhattan apartments, condos, offices and retail — PTAC, ductless, VRF and split systems. Call (914) 223-3301.',
    h1: 'HVAC Repair and Installation in Manhattan',
    lede: 'Apartments, condos, offices and retail spaces — planned around building rules, access and working hours.',
    neighborhoods: ['Lower Manhattan', 'Tribeca', 'SoHo', 'Greenwich Village', 'Chelsea', 'Midtown', 'Murray Hill', 'Upper East Side', 'Upper West Side', 'Harlem', 'Washington Heights', 'Inwood'],
    intro: [
      'Manhattan HVAC work is as much about logistics as equipment. Most buildings have rules on working hours, elevator use and where outdoor units can go, so every job starts with a plan that fits the building.',
      'We work on the systems Manhattan buildings actually use — through-wall PTACs, fan coils, ductless mini-splits, VRF systems and split systems for offices and storefronts.',
    ],
    buildings: [
      { title: 'Pre-war apartments', text: 'Steam heat and window or through-wall AC are the norm. Ductless mini-splits are a quieter, more efficient upgrade where the building allows an outdoor unit.' },
      { title: 'Condos and newer high-rises', text: 'Fan coil units, water-source heat pumps and VRF systems. We diagnose and repair them, and replace the in-unit equipment the owner is responsible for.' },
      { title: 'Offices', text: 'Split systems and VRF for open plans, conference rooms and server closets, with work scheduled outside business hours when needed.' },
      { title: 'Retail and restaurants', text: 'Rooftop and split systems sized for foot traffic, lighting and kitchen heat, so the space stays comfortable on the busiest days.' },
    ],
    faq: [
      { q: 'Can you replace a through-wall (PTAC) unit in my apartment?', a: 'Yes. In many cases a new unit fits the existing wall sleeve; if the sleeve size has changed, we’ll tell you the options before ordering anything.' },
      { q: 'Do you work in offices and commercial spaces?', a: 'Yes. We install and repair split systems, ductless and VRF systems in offices and retail spaces, and can schedule noisy or disruptive work outside your business hours.' },
    ],
  },
  {
    slug: 'bronx',
    name: 'The Bronx',
    inName: 'in the Bronx',
    title: 'HVAC Services in the Bronx, NY | Mode Mechanical',
    description: 'Boiler, heating and AC service in the Bronx for homes and multi-family buildings — from Riverdale to Pelham Bay. 24/7 emergencies. Call (914) 223-3301.',
    h1: 'Heating and AC Service in the Bronx, NY',
    lede: 'Boilers, heating and cooling for houses, multi-family buildings and apartments across the Bronx.',
    neighborhoods: ['Riverdale', 'Kingsbridge', 'Fordham', 'Belmont', 'Morris Park', 'Pelham Bay', 'Throgs Neck', 'City Island', 'Parkchester', 'Mott Haven', 'Wakefield', 'Co-op City'],
    intro: [
      'From the detached homes of Riverdale and Throgs Neck to the walk-ups and larger apartment buildings of the South and Central Bronx, heating is the most urgent call we get here — especially once heat season starts.',
      'We repair and maintain boilers and heating systems, and install cooling that works with the building you have, whether that’s central air in a house or ductless units in an apartment.',
    ],
    buildings: [
      { title: 'Multi-family buildings', text: 'Central boilers and steam systems serve most apartment buildings. Regular maintenance keeps them reliable through the October–May heat season.' },
      { title: 'Detached and semi-detached houses', text: 'Riverdale, Throgs Neck and Pelham Bay homes often have furnaces and central air. We repair, tune up and replace both.' },
      { title: 'Apartments', text: 'Ductless mini-splits give efficient cooling and supplemental heat without relying on window units.' },
      { title: 'Small businesses', text: 'Split systems and rooftop units for storefronts, offices and community spaces.' },
    ],
    faq: [
      { q: 'What are the heating requirements for NYC buildings?', a: 'During heat season (October 1 to May 31), New York City requires building owners to keep indoor temperatures at least 68°F between 6 AM and 10 PM when it is below 55°F outside, and at least 62°F overnight regardless of the outside temperature. A well-maintained boiler is the best way to stay compliant.' },
      { q: 'Do you service boilers in multi-family buildings?', a: 'Yes. We repair and maintain boilers and heating systems in multi-family buildings, and we answer no-heat emergencies around the clock.' },
    ],
  },
  {
    slug: 'staten-island',
    name: 'Staten Island',
    inName: 'on Staten Island',
    title: 'HVAC Services in Staten Island, NY | Mode Mechanical',
    description: 'Central AC, furnace, boiler and heat pump service for Staten Island homes — North Shore, Mid-Island and South Shore. Call (914) 223-3301.',
    h1: 'HVAC Installation and Repair on Staten Island',
    lede: 'Central air, furnaces, boilers and heat pumps for houses across the North Shore, Mid-Island and South Shore.',
    neighborhoods: ['St. George', 'Stapleton', 'Port Richmond', 'West Brighton', 'Todt Hill', 'New Dorp', 'Great Kills', 'Eltingville', 'Annadale', 'Tottenville', 'Bulls Head', 'Grasmere'],
    intro: [
      'Staten Island is mostly houses — detached, semi-detached and townhouse — which makes central air, forced-air furnaces and gas boilers the systems we work on most here.',
      'Many homes are ready for a replacement after 15–20 years of service. We’ll tell you honestly whether a repair is worth it or whether a new, right-sized system will pay for itself in lower bills.',
    ],
    buildings: [
      { title: 'Detached houses', text: 'Central air with a gas furnace or boiler is typical. We repair, maintain and replace both, and can add zoning for upstairs/downstairs comfort.' },
      { title: 'Townhouses', text: 'Compact split systems and heat pumps that fit tight side yards and rooftops.' },
      { title: 'Additions and finished basements', text: 'Ductless mini-splits heat and cool new spaces without extending the existing ductwork.' },
      { title: 'Older homes', text: 'Heat pumps can replace or back up an aging furnace or boiler, cutting fuel use while adding efficient cooling.' },
    ],
    faq: [
      { q: 'Is central air or ductless better for my house?', a: 'If your house already has good ductwork, central air is usually the most cost-effective choice. If it doesn’t, or you only need to cool part of the house, ductless mini-splits avoid the cost and disruption of new ducts.' },
      { q: 'How often should my furnace be serviced?', a: 'Once a year, ideally in the fall before heating season. A tune-up catches worn parts early, keeps efficiency up and checks the safety controls.' },
    ],
  },
  {
    slug: 'long-island',
    name: 'Long Island',
    inName: 'on Long Island',
    title: 'HVAC Services on Long Island, NY | Mode Mechanical',
    description: 'AC, heating and heat pump installation and repair for Long Island homes, including oil-to-heat-pump upgrades. Call (914) 223-3301 to check your town.',
    h1: 'Heating and Air Conditioning on Long Island',
    lede: 'Central air, furnaces, boilers and heat pumps for Long Island homes. Call to confirm we cover your town.',
    neighborhoods: ['Garden City', 'Hempstead', 'Valley Stream', 'Great Neck', 'Manhasset', 'Long Beach', 'Rockville Centre', 'Mineola', 'Hicksville', 'Levittown', 'Massapequa', 'Freeport'],
    intro: [
      'Long Island homes are larger, often with attic ductwork, central air and an oil or gas furnace or boiler. Many homeowners are now looking at heat pumps to cut heating costs and move off oil.',
      'We install, repair and maintain central air, furnaces, boilers, heat pumps and ductless systems. Not sure we reach your town? Call and we’ll tell you straight away.',
    ],
    buildings: [
      { title: 'Colonials and split-levels', text: 'Central air with attic or basement ductwork. Zoning and a properly sized system fix the classic too-hot-upstairs problem.' },
      { title: 'Oil-heated homes', text: 'Cold-climate heat pumps can replace or back up an oil boiler or furnace, lowering fuel costs and adding efficient cooling.' },
      { title: 'Capes and ranches', text: 'Ductless mini-splits are ideal for finished attics, additions and rooms the ductwork never reached.' },
      { title: 'Shore homes', text: 'Outdoor units near the water need corrosion-resistant equipment and the right mounting to last.' },
    ],
    faq: [
      { q: 'Can I replace my oil boiler with a heat pump?', a: 'Often, yes. A cold-climate heat pump can heat most homes on its own, or work alongside your existing boiler as backup on the coldest days. We assess your insulation, ductwork and electrical service before recommending a setup.' },
      { q: 'Do you cover my town?', a: 'Call (914) 223-3301 with your town or ZIP code and we’ll tell you right away whether it’s in our service area.' },
    ],
  },
  {
    slug: 'westchester',
    name: 'Westchester County',
    inName: 'in Westchester County',
    title: 'HVAC Services in Westchester County | Mode Mechanical',
    description: 'Heating, AC and ductless installation and repair in Westchester — Yonkers, New Rochelle, White Plains and nearby. Call (914) 223-3301.',
    h1: 'HVAC Installation and Repair in Westchester County',
    lede: 'Heating and cooling for older homes and newer houses from Yonkers to White Plains. Call to confirm we cover your town.',
    neighborhoods: ['Yonkers', 'Mount Vernon', 'New Rochelle', 'Pelham', 'Larchmont', 'Mamaroneck', 'Scarsdale', 'White Plains', 'Eastchester', 'Bronxville', 'Hastings-on-Hudson', 'Tarrytown'],
    intro: [
      'Many Westchester homes are older Tudors, colonials and Victorians heated by boilers and radiators, with no ductwork for air conditioning. Newer and renovated houses often have central air and zoned systems.',
      'We add cooling without tearing into plaster walls, repair and maintain heating systems, and install heat pumps that heat and cool in one system. Not sure we reach your town? Call and we’ll tell you.',
    ],
    buildings: [
      { title: 'Older homes with radiators', text: 'Ductless or small-duct high-velocity systems add central-style cooling while keeping the original walls and radiators intact.' },
      { title: 'Larger houses', text: 'Zoned central air and multi-zone heat pumps keep every floor comfortable without overcooling the rest.' },
      { title: 'Renovations and additions', text: 'Ductless mini-splits heat and cool new spaces without extending the existing system.' },
      { title: 'Boiler-heated homes', text: 'Boiler repair and maintenance, plus heat pumps that can take over most of the heating load.' },
    ],
    faq: [
      { q: 'How do I add air conditioning to an older home with radiators?', a: 'The two common options are ductless mini-splits, with an indoor unit in each room, and small-duct high-velocity systems that run flexible tubes through closets and attics. Both avoid opening up walls, and we’ll recommend the one that suits your layout.' },
      { q: 'Do you cover my town?', a: 'Call (914) 223-3301 with your town or ZIP code and we’ll tell you right away whether it’s in our service area.' },
    ],
  },
];

export const areaHref = (a: Area) => `/areas/${a.slug}/`;
