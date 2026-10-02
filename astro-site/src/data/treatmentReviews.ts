// Fecha de última actualización y revisión clínica de cada página de tratamiento.
// Fuente única para el texto visible y para el JSON-LD (MedicalWebPage).
//
// `updated` es la fecha en que se publicó el último cambio de contenido.
// `reviewedBy` (id de un doctor de doctors.ts) y `reviewedOn` se rellenan SOLO cuando
// ese doctor confirma que revisó la página: mientras estén vacíos no se muestra ni se
// publica ninguna afirmación de revisión clínica.
export interface TreatmentReview {
  updated: string; // YYYY-MM-DD
  reviewedBy?: string;
  reviewedOn?: string; // YYYY-MM-DD
}

export const treatmentReviews: Record<string, TreatmentReview> = {
  'root-canal': { updated: '2026-10-02' },
  'cracked-teeth': { updated: '2026-10-02' },
  'dental-trauma': { updated: '2026-10-02' },
  'apical-surgery': { updated: '2026-10-02' },
  'endodontic-retreatment': { updated: '2026-10-02' },
};
