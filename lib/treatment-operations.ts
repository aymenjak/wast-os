/**
 * Disposal (D) and recovery (R) operations, as listed in the annexes of décret exécutif n° 19-10 du 23 janvier 2019
 * (JORA n° 07/2019, "Liste des abréviations et codes utilisés dans le document de notification / de mouvement", p. 12 and 14)
 * — the Basel Convention codes, published in Algerian law. Labels are the official French wording.
 */
export const TREATMENT_OPERATIONS = [
  ["D1", "Dépôt sur ou dans le sol (par ex : mise en décharge, etc.)"],
  ["D2", "Traitement en milieu terrestre (par ex : biodégradation de déchets liquides ou de boues dans les sols, etc.)"],
  ["D3", "Injection en profondeur (par ex : injection des déchets pompables dans des puits, des dômes de sel ou des failles géologiques naturelles, etc.)"],
  ["D4", "Lagunage (par ex : déversement de déchets liquides ou de boues dans des puits, des étangs ou des bassins, etc.)"],
  ["D5", "Mise en décharge spécialement aménagée (par ex : placement dans des alvéoles étanches séparées, recouvertes et isolées les unes des autres et de l'environnement, etc.)"],
  ["D6", "Rejet dans le milieu aquatique, excepté les mers ou les océans"],
  ["D7", "Rejet dans les mers ou les océans, y compris enfouissement dans le sous-sol marin"],
  ["D8", "Traitement biologique non spécifié ailleurs dans cette liste, aboutissant à des composés ou à des mélanges qui sont éliminés selon l'un des procédés de cette annexe"],
  ["D9", "Traitement physico-chimique non spécifié ailleurs dans cette liste, aboutissant à des composés ou à des mélanges qui sont éliminés selon l'un des procédés de cette liste (par ex : évaporation, séchage, calcination, etc.)"],
  ["D10", "Incinération à terre"],
  ["D11", "Incinération en mer"],
  ["D12", "Stockage permanent (par ex : placement de conteneurs dans une mine, etc.)"],
  ["D13", "Mélange ou regroupement, préalablement à l'une des opérations de cette liste"],
  ["D14", "Reconditionnement, préalablement à l'une des opérations de cette liste"],
  ["D15", "Stockage, préalablement à l'une des opérations de cette liste"],
  ["R1", "Utilisation comme combustible (autrement qu'en incinération directe) ou autre moyen de produire de l'énergie"],
  ["R2", "Récupération ou régénération des solvants"],
  ["R3", "Recyclage ou récupération des substances organiques qui ne sont pas utilisées comme solvants"],
  ["R4", "Recyclage ou récupération des métaux ou des composés métalliques"],
  ["R5", "Recyclage ou récupération d'autres matières inorganiques"],
  ["R6", "Régénération des acides ou des bases"],
  ["R7", "Récupération des produits servant à capter les polluants"],
  ["R8", "Récupération des produits provenant des catalyseurs"],
  ["R9", "Régénération ou autres réemplois des huiles usées"],
  ["R10", "Épandage sur le sol au profit de l'agriculture ou de l'écologie"],
  ["R11", "Utilisation de matériaux résiduels obtenus à partir de l'une des opérations numérotées de R1 à R10"],
  ["R12", "Échange de déchets en vue de les soumettre à l'une quelconque des opérations numérotées de R1 à R11"],
  ["R13", "Stockage de matériaux en vue de les soumettre à l'une des opérations de cette liste"],
] as const;

export type TreatmentCode = (typeof TREATMENT_OPERATIONS)[number][0];
export const TREATMENT_CODES = TREATMENT_OPERATIONS.map((o) => o[0]) as unknown as readonly [TreatmentCode, ...TreatmentCode[]];
export const treatmentLabel = (code: string) => TREATMENT_OPERATIONS.find((o) => o[0] === code)?.[1] ?? null;
/** D13–D15 and R12–R13 are preliminary operations (regrouping, reconditioning, storage): the waste goes on to a final operation. */
export const isPreliminary = (code: string) => ["D13", "D14", "D15", "R12", "R13"].includes(code);
