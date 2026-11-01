/** Default waste categories created for every organization; editable later. */
export const DEFAULT_WASTE_CATEGORIES = [
  { code: "MSW", nameEn: "Household & similar waste", nameFr: "Déchets ménagers et assimilés", nameAr: "النفايات المنزلية وما شابهها", hazardous: false, stream: "RESIDUAL", regulatoryClass: "HOUSEHOLD_SIMILAR" },
  { code: "CARDBOARD", nameEn: "Paper & cardboard", nameFr: "Papier et carton", nameAr: "الورق والكرتون", hazardous: false, stream: "PAPER_CARDBOARD", regulatoryClass: "HOUSEHOLD_SIMILAR" },
  { code: "PLASTIC", nameEn: "Plastics", nameFr: "Plastiques", nameAr: "البلاستيك", hazardous: false, stream: "MIXED_PLASTIC", regulatoryClass: "HOUSEHOLD_SIMILAR" },
  { code: "METAL", nameEn: "Metals", nameFr: "Métaux", nameAr: "المعادن", hazardous: false, stream: "FERROUS", regulatoryClass: "HOUSEHOLD_SIMILAR" },
  { code: "GLASS", nameEn: "Glass", nameFr: "Verre", nameAr: "الزجاج", hazardous: false, stream: "GLASS", regulatoryClass: "HOUSEHOLD_SIMILAR" },
  { code: "ORGANIC", nameEn: "Organic / green waste", nameFr: "Déchets organiques / verts", nameAr: "النفايات العضوية والخضراء", hazardous: false, stream: "ORGANIC", regulatoryClass: "HOUSEHOLD_SIMILAR" },
  { code: "INERT", nameEn: "Inert / construction waste", nameFr: "Déchets inertes / BTP", nameAr: "النفايات الهامدة / البناء", hazardous: false, stream: "INERT", regulatoryClass: "INERT" },
  { code: "SPECIAL", nameEn: "Special waste (regulated)", nameFr: "Déchets spéciaux (réglementés)", nameAr: "النفايات الخاصة (منظمة)", hazardous: true, stream: "SPECIAL", regulatoryClass: "SPECIAL_HAZARDOUS" },
] as const;

/**
 * Autocomplete suggestions only: the field is free text so it survives territorial reforms.
 * This list holds the 58 pre-2026 wilayas. Algeria moved to 69 wilayas in 2026 (press reports citing
 * JO n°25/2026); the 11 new names must be added from the official Journal officiel text, not from press.
 */
export const WILAYA_SUGGESTIONS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira",
  "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda",
  "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara",
  "Ouargla", "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt",
  "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa",
  "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam",
  "Touggourt", "Djanet", "El M'Ghair", "El Meniaa",
];
