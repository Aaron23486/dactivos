// Datos ficticios para demostraciones locales. Los códigos empiezan con DEMO- para reconocerlos.

export const DEMO_DEPARTMENTS = [
  { code: "OPERACIONES", name: "Operaciones" },
  { code: "LOGISTICA", name: "Logística" },
  { code: "TECNOLOGIA", name: "Tecnología" },
  { code: "ADMINISTRACION", name: "Administración" },
  { code: "MANTENIMIENTO", name: "Mantenimiento" },
] as const;

export const DEMO_EMPLOYEES = [
  { code: "DEMO-E001", name: "Laura Méndez Rojas", department: "OPERACIONES" },
  { code: "DEMO-E002", name: "Carlos Vargas Solís", department: "OPERACIONES" },
  { code: "DEMO-E003", name: "Ana Lucía Pérez", department: "LOGISTICA" },
  { code: "DEMO-E004", name: "José Pablo Araya", department: "LOGISTICA" },
  { code: "DEMO-E005", name: "María Fernanda Castro", department: "LOGISTICA" },
  { code: "DEMO-E006", name: "Diego Alvarado Mora", department: "TECNOLOGIA" },
  { code: "DEMO-E007", name: "Sofía Jiménez Ulate", department: "TECNOLOGIA" },
  { code: "DEMO-E008", name: "Andrés Quesada León", department: "ADMINISTRACION" },
  { code: "DEMO-E009", name: "Valeria Chaves Núñez", department: "ADMINISTRACION" },
  { code: "DEMO-E010", name: "Luis Diego Campos", department: "MANTENIMIENTO" },
  { code: "DEMO-E011", name: "Daniela Rojas Brenes", department: "OPERACIONES" },
  { code: "DEMO-E012", name: "Esteban Salas Vega", department: "LOGISTICA" },
] as const;

const HANDHELD_MODELS = ["Zebra TC52", "Honeywell CT40", "Zebra MC3300"];
const COMPUTER_MODELS = ["Lenovo ThinkCentre M70", "HP ProDesk 400", "Dell OptiPlex 7010"];

export const DEMO_ASSETS = [
  ...Array.from({ length: 10 }, (_, i) => ({
    code: `DEMO-HH-${String(i + 1).padStart(3, "0")}`,
    serial: `SN-DEMO-HH-${String(1001 + i)}`,
    category: "HANDHELD" as const,
    name: HANDHELD_MODELS[i % HANDHELD_MODELS.length],
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    code: `DEMO-PC-${String(i + 1).padStart(3, "0")}`,
    serial: `SN-DEMO-PC-${String(2001 + i)}`,
    category: "COMPUTER" as const,
    name: COMPUTER_MODELS[i % COMPUTER_MODELS.length],
  })),
];

/** Entregas que hace la demostración: código de activo → código de empleado. */
export const DEMO_ASSIGNMENTS = [
  ["DEMO-HH-001", "DEMO-E001"],
  ["DEMO-HH-002", "DEMO-E002"],
  ["DEMO-HH-003", "DEMO-E003"],
  ["DEMO-HH-004", "DEMO-E004"],
  ["DEMO-HH-005", "DEMO-E005"],
  ["DEMO-HH-006", "DEMO-E011"],
  ["DEMO-PC-001", "DEMO-E006"],
  ["DEMO-PC-002", "DEMO-E007"],
  ["DEMO-PC-003", "DEMO-E008"],
  ["DEMO-PC-004", "DEMO-E009"],
] as const;

/** Devoluciones posteriores. Una devolución dañada abre un caso de mantenimiento automáticamente. */
export const DEMO_RETURNS = [
  { asset: "DEMO-HH-005", condition: "GOOD", notes: null },
  { asset: "DEMO-PC-004", condition: "GOOD", notes: null },
  {
    asset: "DEMO-HH-006",
    condition: "DAMAGED",
    notes: "Pantalla con fisura en la esquina superior; el lector enciende.",
  },
  {
    asset: "DEMO-PC-003",
    condition: "DAMAGED",
    notes: "No enciende después de un corte eléctrico en el área administrativa.",
  },
] as const;

/** De los casos anteriores, este se resuelve y su activo se libera. */
export const DEMO_RESOLVED_ASSET = "DEMO-PC-003";

/** Activo que un administrador retira de circulación. */
export const DEMO_RETIRED_ASSET = "DEMO-HH-010";
