export interface Payer {
  id: string;
  name: string;
  ownership: string;
  address: string;
  city: string;
  state_headquartered: string;
  zip: string;
  phone: string;
  amount_covered: number;
  amount_uncovered: number;
  revenue: number;
  covered_encounters: number;
  uncovered_encounters: number;
  covered_medications: number;
  uncovered_medications: number;
  covered_procedures: number;
  uncovered_procedures: number;
  covered_immunizations: number;
  uncovered_immunizations: number;
  unique_customers: number;
  qols_avg: number;
  member_months: number;
}

export interface Procedure {
  start: Date;
  stop: Date;
  patient: string;
  encounter: string;
  system: string;
  code: string;
  description: string;
  base_cost: number;
}

export interface Encounter {
  id: string;
  start: Date;
  stop: Date;
  patient: string;
  organization: string;
  provider: string;
  payer: string;
  encounterclass: string;
  code: string;
  description: string;
  base_encounter_cost: number;
  total_claim_cost: number;
  payer_coverage: number;
}

export interface Patient {
  id: string;
  birthdate: Date;
  ssn: string;
  first: string;
  last: string;
  race: string;
  ethnicity: string;
  gender: string;
  birthplace: string;
  address: string;
  city: string;
  state: string;
  county: string;
  zip: string;
  lat: number;
  lon: number;
  healthcare_expenses: number;
  healthcare_coverage: number;
  income: number;
}

export interface Organization {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
  phone: string;
  revenue: number;
  utilization: number;
} 