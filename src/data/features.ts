import type { IconName } from '../lib/icons';

export interface Feature { title: string; text: string; icon?: IconName }

export const heroFeatures: Feature[] = [
  { title: 'Expert HVAC Technicians', text: 'Licensed, background-checked and trained on every major system.', icon: 'hardHat' },
  { title: 'Flexible Scheduling', text: 'Evenings and weekends available, including same-day calls.', icon: 'calendarClock' },
  { title: 'Transparent Pricing', text: 'Written estimate before any work begins. No surprises.', icon: 'priceBadge' },
];

export const whyChooseHome: Feature[] = [
  { title: 'Expert HVAC Technicians', text: 'Our certified HVAC professionals in New York have the skills and experience to handle any heating or cooling issue with precision and care.', icon: 'hardHat' },
  { title: 'Flexible Scheduling', text: 'We work around your schedule—offering convenient HVAC appointments, including evenings and weekends, to fit your lifestyle.', icon: 'calendarClock' },
  { title: 'Transparent Pricing', text: 'No hidden fees. We offer clear, upfront pricing on all air conditioning and heating services so you know exactly what to expect.', icon: 'priceBadge' },
  { title: 'High-Quality HVAC Parts', text: 'We use only premium, energy-efficient HVAC components to ensure long-lasting performance and lower utility bills.', icon: 'wrench' },
  { title: '24/7 Emergency HVAC Services', text: 'HVAC problems don’t wait—and neither do we. Mode Mechanical offers fast, 24/7 emergency heating and AC repair in New York.', icon: 'siren' },
  { title: '100% Satisfaction Guaranteed', text: 'Your comfort is our priority. We back every HVAC service with a satisfaction guarantee for total peace of mind.', icon: 'shieldCheck' },
];

export const whyChooseAbout: Feature[] = [
  { title: 'Licensed HVAC Technicians in New York', text: 'Every technician on our team is licensed, background-checked and trained across central air conditioners, furnaces, boilers and heat pumps, so your repair or installation is done right the first time.', icon: 'hardHat' },
  { title: 'Flexible Scheduling, Including Evenings and Weekends', text: 'Book AC repair, furnace service or seasonal HVAC maintenance at a time that works around your schedule — including evenings and weekends.', icon: 'calendarClock' },
  { title: 'Transparent, Upfront Pricing', text: 'No hidden fees and no surprise charges. You get a clear written estimate before any heating or cooling work begins.', icon: 'priceBadge' },
  { title: 'Premium Parts and Equipment', text: 'We install high-quality, energy-efficient components from Carrier, Trane, Daikin and other trusted manufacturers — fewer breakdowns and lower energy bills.', icon: 'wrench' },
  { title: '24/7 Emergency HVAC Repair', text: 'A failed furnace in January or a dead AC in August can’t wait for business hours. We offer round-the-clock emergency repair across New York City.', icon: 'siren' },
  { title: '100% Satisfaction Guarantee', text: 'We stand behind every AC repair, heating installation and HVAC tune-up we perform. If you’re not fully satisfied, we’ll come back and make it right.', icon: 'shieldCheck' },
];

export const maintenanceFeatures: Feature[] = [
  { title: 'Expert HVAC Technicians', text: 'Our certified technicians in Brooklyn follow a full checklist on every tune-up — coils, refrigerant, airflow, electrical connections and safety controls.', icon: 'hardHat' },
  { title: 'Flexible Scheduling', text: 'Book your seasonal tune-up when it suits you, including evenings and weekends.', icon: 'calendarClock' },
  { title: 'Transparent Pricing', text: 'One flat price for the maintenance visit. If we find a problem, you get the cost before any repair starts.', icon: 'priceBadge' },
  { title: 'High-Quality HVAC Parts', text: 'When something needs replacing, we use premium components that last.', icon: 'wrench' },
  { title: '24/7 Emergency HVAC Services', text: 'Regular maintenance prevents most emergencies. For the rest, we answer around the clock across New York City.', icon: 'siren' },
  { title: '100% Satisfaction Guaranteed', text: 'If your system isn’t running better after our visit, we come back.', icon: 'shieldCheck' },
];

export const repairFeatures: Feature[] = [
  { title: 'Expert HVAC Technicians', text: 'Licensed technicians who diagnose the actual fault instead of swapping parts until something works.', icon: 'hardHat' },
  { title: 'Flexible Scheduling', text: 'Same-day appointments in most cases, including evenings and weekends.', icon: 'calendarClock' },
  { title: 'Transparent Pricing', text: 'You get the diagnosis and the repair cost before we start. No surprise invoice.', icon: 'priceBadge' },
  { title: 'High-Quality HVAC Parts', text: 'We stock common parts, so most repairs are finished on the first visit.', icon: 'wrench' },
  { title: '24/7 Emergency HVAC Services', text: 'No heat in January or no cooling in a heatwave can’t wait. We answer around the clock.', icon: 'siren' },
  { title: '100% Satisfaction Guaranteed', text: 'If the same fault returns, we come back and make it right.', icon: 'shieldCheck' },
];

export const repairProblems: Feature[] = [
  { title: 'Air conditioning not cooling', text: 'usually low refrigerant, a dirty condenser coil or a failing compressor. We diagnose before replacing parts.' },
  { title: 'Heating system not working', text: 'a failed ignitor, bad thermocouple or tripped safety control. Most furnace repairs are finished on the same visit.' },
  { title: 'Poor airflow', text: 'clogged filters, blocked ducts or a weak blower motor restricting air through the system.' },
  { title: 'Strange noises', text: 'grinding, squealing or banging usually means a failing motor bearing, loose blower wheel or ductwork expansion.' },
  { title: 'Leaking refrigerant', text: 'low refrigerant is always a leak, never normal consumption. We find and repair the leak rather than just topping it up.' },
  { title: 'Frozen evaporator coils', text: 'caused by restricted airflow or low refrigerant. Running the system frozen damages the compressor.' },
  { title: 'Thermostat malfunction', text: 'miscalibration, wiring faults or a failing control board making the system short-cycle.' },
  { title: 'Clogged condensate drain', text: 'backs up and causes water damage to ceilings and walls, common in Brooklyn and Queens apartments.' },
  { title: 'Electrical issues', text: 'failed capacitors, contactors or control boards, the most frequent cause of an air conditioner that won’t start.' },
  { title: 'Uneven heating or cooling', text: 'one room freezing while another bakes, usually a ductwork, zoning or balance problem.' },
];

export const installSystems: Feature[] = [
  { title: 'Central air conditioning', text: 'full system installation and replacement' },
  { title: 'Ductless mini-splits', text: 'ideal for brownstones and buildings without ductwork' },
  { title: 'Furnaces and boilers', text: 'gas, oil and high-efficiency condensing units' },
  { title: 'Heat pumps', text: 'single-zone and multi-zone, including cold-climate models' },
  { title: 'Ductwork', text: 'new runs, replacement and sealing' },
  { title: 'Thermostats', text: 'smart and programmable controls' },
];

export const installationFeatures: Feature[] = [
  { title: 'Expert HVAC Technicians', text: 'Certified installers who size equipment to your building — square footage, insulation, windows and existing ductwork — before quoting.', icon: 'hardHat' },
  { title: 'Flexible Scheduling', text: 'Most residential installations are completed in one to two days, scheduled around you.', icon: 'calendarClock' },
  { title: 'Transparent Pricing', text: 'A written estimate after an on-site assessment, with no obligation.', icon: 'priceBadge' },
  { title: 'High-Quality HVAC Equipment', text: 'Systems from Trane, Carrier, Daikin, Mitsubishi Electric, LG, York and other leading manufacturers.', icon: 'wrench' },
  { title: 'Permits and Inspections', text: 'We pull the required permits and coordinate inspections so every installation is code-compliant.', icon: 'fileCheck' },
  { title: 'Manufacturer Warranty', text: 'Every new system is backed by its manufacturer warranty.', icon: 'award' },
];

