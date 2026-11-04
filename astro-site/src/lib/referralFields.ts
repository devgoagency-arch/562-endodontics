// Los campos del formulario de referrals en el mismo orden y con las mismas etiquetas que ve el dentista.
// Sirve para guardar en WordPress (sección "Referrals") una copia completa del formulario: también salen los
// campos que se dejaron vacíos y, al final, cualquier campo nuevo que no esté en esta lista.
// Si se agrega o cambia un campo en src/pages/referrals.astro, hay que reflejarlo aquí.
export interface ReferralRow {
  section: string;
  label: string;
  value: string;
}

const SECTIONS: { title: string; fields: [key: string, label: string][] }[] = [
  {
    title: 'Preferred doctor for appointment scheduling',
    fields: [['refering_doctor[]', 'Preferred doctor']],
  },
  {
    title: 'Referring Doctor',
    fields: [
      ['doctor_name', "Dr.'s First Name"],
      ['doctor_last_name', 'Last Name'],
      ['_email', 'Email'],
      ['OfficePhoneNumber', 'Office Phone Number'],
      ['office_name', 'Office Name'],
    ],
  },
  {
    title: 'Patient Information',
    fields: [
      ['first_name', 'First Name'],
      ['last_name', 'Last Name'],
      ['_patient_email', 'Patient Email'],
      ['cell_phone', 'Preferred Phone number'],
      ['home_phone', 'Home Phone'],
      ['date_birth', 'Date of Birth'],
    ],
  },
  {
    title: 'Referred For',
    fields: [
      ['tooth_number', 'Tooth Number'],
      ['referred_for', 'Referred for'],
      ['dental_anxiety_sedation', 'Patient with dental anxiety, please discuss options for sedation'],
      ['tooth_status', 'Tooth Status'],
      ['restorative_treatment_planned', 'Restorative Treatment Planned by Referring Dentist'],
      ['restoration_after_treatment', 'Restoration After Treatment'],
    ],
  },
  {
    title: 'Insurance Information',
    fields: [
      ['_company', 'Company'],
      ['member_id_policy', 'Member ID/Certificate ID #'],
      ['group_number', 'Group #/Policy #'],
      ['policy_holder', 'Policy Holder'],
      ['policy_holder_date_birth', 'Policy Holder: Date of Birth'],
      ['policy_holder_address', 'Policy Holder Address'],
      ['special_considerations', 'Special Accommodation'],
      ['terms_conditions', 'Agreed to the Terms of Use and Privacy Policy'],
    ],
  },
];

const prettify = (key: string) => {
  const text = key.replace(/\[\]$/, '').replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function referralRows(referral: Record<string, string>): ReferralRow[] {
  const known = new Set<string>();
  const rows: ReferralRow[] = [];
  for (const section of SECTIONS) {
    for (const [key, label] of section.fields) {
      known.add(key);
      rows.push({ section: section.title, label, value: referral[key] ?? '' });
    }
  }
  for (const [key, value] of Object.entries(referral)) {
    if (!known.has(key)) rows.push({ section: 'Other', label: prettify(key), value });
  }
  return rows;
}
