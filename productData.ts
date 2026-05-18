export type ProductOption = {
  dosage: string;
  price: number;
  status: "in stock" | "pre-sale" | "out of stock";
  purchaseType: "single" | "kit";
};

export type Product = {
  name: string;
  slug: string;
  color: string;
  image: string;
  shortDescription: string;
  description: string;
  options: ProductOption[];
};

export const products: Product[] = [
  {
    name: "Tirzepatide",
    slug: "tirzepatide",
    color: "#ff2fbf",
    image: "/tirzepatide.png",
    shortDescription: "Dual GIP/GLP-1 receptor agonist used in research involving metabolic pathways.",
    description:
      "Tirzepatide is a once-weekly, subcutaneous injectable medication acting as a dual agonist for GIP and GLP-1 receptors, approved for managing type 2 diabetes and chronic weight management. It improves glycemic control, promotes significant weight loss by reducing appetite and slowing gastric emptying, and is used alongside diet and exercise.",
    options: [
      { dosage: "30mg", price: 60, status: "in stock", purchaseType: "single" },
      { dosage: "60mg", price: 100, status: "in stock", purchaseType: "single" },
      { dosage: "100mg", price: 155, status: "pre-sale", purchaseType: "single" },
      { dosage: "120mg", price: 185, status: "pre-sale", purchaseType: "single" },
      { dosage: "30mg", price: 360, status: "in stock", purchaseType: "kit" },
      { dosage: "60mg", price: 600, status: "in stock", purchaseType: "kit" },
      { dosage: "100mg", price: 1200, status: "pre-sale", purchaseType: "kit" },
      { dosage: "120mg", price: 1400, status: "pre-sale", purchaseType: "kit" },
    ],
  },
  {
    name: "Retatrutide",
    slug: "retatrutide",
    color: "#00aaff",
    image: "/retatrutide.png",
    shortDescription: "Triple-receptor agonist research compound involving GIP, GLP-1, and glucagon pathways.",
    description:
      "Retatrutide is an investigational, once-weekly injectable triple-hormone receptor agonist targeting GIP, GLP-1, and glucagon pathways. It is being studied for obesity and type 2 diabetes research, including appetite, digestion, metabolism, and body weight pathways.",
    options: [
      { dosage: "10mg", price: 80, status: "in stock", purchaseType: "single" },
      { dosage: "20mg", price: 140, status: "in stock", purchaseType: "single" },
      { dosage: "40mg", price: 260, status: "in stock", purchaseType: "single" },
      { dosage: "60mg", price: 360, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "Tesamorelin",
    slug: "tesamorelin",
    color: "#cfd3d8",
    image: "/tesamorelin.png",
    shortDescription: "Synthetic growth hormone-releasing factor analog used in research.",
    description:
      "Tesamorelin is a synthetic growth hormone-releasing factor analog used in research involving growth hormone signaling, IGF-1 pathways, metabolism, and visceral fat-related studies.",
    options: [
      { dosage: "10mg", price: 75, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "Ipamorelin",
    slug: "ipamorelin",
    color: "#ffbf00",
    image: "/ipamorelin.png",
    shortDescription: "Selective growth hormone secretagogue research peptide.",
    description:
      "Ipamorelin is a synthetic pentapeptide and selective growth hormone secretagogue that acts as a ghrelin receptor agonist. It is commonly studied in research involving growth hormone release, body composition, recovery, and aging pathways.",
    options: [
      { dosage: "10mg", price: 70, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "KLOW",
    slug: "klow",
    color: "#b74cff",
    image: "/klow.png",
    shortDescription: "4-in-1 peptide blend research compound.",
    description:
      "KLOW is a 4-in-1 peptide blend containing BPC-157, TB-500, KPV, and GHK-Cu. It is used in research involving tissue repair, inflammation, collagen synthesis, cellular regeneration, joint health, gut integrity, and skin-related pathways.",
    options: [
      { dosage: "80mg", price: 175, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "Semax",
    slug: "semax",
    color: "#00d6c9",
    image: "/semax.png",
    shortDescription: "Synthetic regulatory peptide studied for cognitive pathways.",
    description:
      "Semax is a synthetic regulatory peptide and ACTH analog studied for nootropic, neuroprotective, and neurorestorative pathways. Research areas include attention, memory, learning, fatigue, stress tolerance, BDNF expression, and neurotransmitter regulation.",
    options: [
      { dosage: "10mg", price: 65, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "Selank",
    slug: "selank",
    color: "#7cff00",
    image: "/selank.png",
    shortDescription: "Synthetic nootropic peptide derived from tuftsin.",
    description:
      "Selank is a synthetic nootropic peptide derived from tuftsin. It is studied for anti-stress, anxiolytic, cognitive, immune regulation, and neurotransmitter modulation pathways.",
    options: [
      { dosage: "10mg", price: 65, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "SS-31",
    slug: "ss-31",
    color: "#ff7a00",
    image: "/ss-31.png",
    shortDescription: "Mitochondria-targeted peptide research compound.",
    description:
      "SS-31, also known as Elamipretide or MTP-131, is a synthetic tetrapeptide studied for mitochondrial function, ATP production, oxidative stress, cardiolipin interaction, and cellular protection pathways.",
    options: [
      { dosage: "10mg", price: 85, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "MOTS-C",
    slug: "mots-c",
    color: "#ff0000",
    image: "/mots-c.png",
    shortDescription: "Mitochondrial-derived peptide studied for metabolic regulation.",
    description:
      "MOTS-c is a 16-amino acid mitochondrial-derived peptide studied for metabolic regulation, AMPK activation, energy metabolism, insulin sensitivity, glucose homeostasis, inflammation, oxidative stress, and healthy aging pathways.",
    options: [
      { dosage: "10mg", price: 90, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "Bac Water",
    slug: "bac-water",
    color: "#4dbbff",
    image: "/bac-water.png",
    shortDescription: "Bacteriostatic water for research preparation use.",
    description:
      "Bacteriostatic water is commonly used in research settings for preparation and reconstitution workflows. For research purposes only.",
    options: [
      { dosage: "10mL", price: 15, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "MT2",
    slug: "mt2",
    color: "#b87333",
    image: "/mt2.png",
    shortDescription: "Melanotan II research peptide.",
    description:
      "MT2, commonly known as Melanotan II, is a synthetic peptide studied in research involving melanocortin receptor pathways, pigmentation-related mechanisms, appetite, libido, and energy regulation pathways.",
    options: [
      { dosage: "10mg", price: 65, status: "in stock", purchaseType: "single" },
    ],
  },
  {
    name: "Off-CaT",
    slug: "off-cat",
    color: "#111111",
    image: "/off-cat.png",
    shortDescription: "Off-caTalog research item.",
    description:
      "Off-CaT is an off-caTalog research item category for specialty requests and non-standard product availability. Contact PUGPEP for current details.",
    options: [
      { dosage: "250mg", price: 60, status: "in stock", purchaseType: "single" },
    ],
  },
];