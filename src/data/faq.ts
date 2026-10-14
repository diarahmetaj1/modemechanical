export interface Faq { q: string; a: string }

export const homeFaq: Faq[] = [
  { q: 'When should I schedule maintenance?', a: 'It’s best to schedule HVAC maintenance at least once a year, ideally in the spring for air conditioners and fall for heating systems. Regular service from our certified HVAC technicians helps prevent breakdowns, improves energy efficiency, and extends the life of your system.' },
  { q: 'How often should I replace HVAC filters?', a: 'We recommend changing your HVAC filters every 1 to 3 months, depending on usage, pets, and allergies. Clean filters keep your air conditioning system running efficiently and improve indoor air quality in your home or business.' },
  { q: 'Do you use genuine parts for repairs?', a: 'Yes, we use only genuine, high-quality parts for all HVAC repairs to ensure lasting performance and manufacturer warranty compliance. Your comfort and system reliability are our top priorities.' },
  { q: 'Is there a warranty on your repairs?', a: 'Absolutely. We offer a warranty on all HVAC repairs, covering both parts and labor. You can trust our licensed HVAC professionals to stand behind their work and deliver peace of mind.' },
  { q: 'How do I get a quote for my repair?', a: 'Getting a quote is easy! Just contact our team by phone or online to schedule an HVAC inspection or service call. We’ll assess the issue and provide a transparent, no-obligation estimate for your air conditioner or heating system repair.' },
];

export const installationFaq: Faq[] = [
  { q: 'How long does an HVAC installation take?', a: 'Most residential installations are completed in one to two days. A ductless mini-split is often a single day; a full system replacement with new ductwork can take longer.' },
  { q: 'Do you handle permits and inspections?', a: 'Yes. We pull the required permits and coordinate inspections so the installation is fully code-compliant.' },
  { q: 'What does a new HVAC system cost in New York?', a: 'Cost depends on system type, size and the condition of the existing ductwork. We provide a written estimate after an on-site assessment, with no obligation.' },
];

export const miniSplitFaq: Faq[] = [
  { q: 'How many rooms can one outdoor unit serve?', a: 'A single-zone system has one indoor unit. Multi-zone outdoor units can run several indoor units — commonly two to five, and more on larger models — each with its own temperature control.' },
  { q: 'Do mini-splits heat in the winter?', a: 'Yes. Every mini-split we install is a heat pump, and cold-climate models are designed to keep heating efficiently through New York winters. Many customers use them to supplement a boiler or replace electric baseboard heat.' },
  { q: 'How long does a mini-split installation take?', a: 'A single-zone installation is usually done in one day. Multi-zone systems take longer depending on the number of rooms and how the lines are routed.' },
  { q: 'What maintenance do ductless systems need?', a: 'Rinse the washable filters every month or two in heavy use, and book a professional cleaning once a year to clean the coils, blower wheel and drain line so the system stays efficient and odor-free.' },
];

export const heatPumpFaq: Faq[] = [
  { q: 'Will a heat pump keep my home warm in January?', a: 'A correctly sized cold-climate heat pump will heat most New York homes through the winter. If your home is large or drafty, a hybrid setup that keeps your furnace or boiler as backup for the coldest days is a reliable option.' },
  { q: 'Do I have to remove my boiler or furnace?', a: 'No. Many homeowners keep the existing system as backup at first. We’ll recommend whether a full replacement or a hybrid setup makes more sense for your home and budget.' },
  { q: 'Will I need an electrical upgrade?', a: 'Sometimes. A heat pump adds electrical load, so we check your panel and service size during the assessment and tell you up front if an upgrade is needed.' },
  { q: 'Are there rebates for heat pumps in New York?', a: 'New York offers heat pump incentives through the NYS Clean Heat program, run by utilities such as Con Edison and PSEG Long Island. Amounts and eligibility change, so ask us about current options when you request a quote.' },
];
