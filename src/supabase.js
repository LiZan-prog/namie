// =====================================================================
// The ONLY file that talks to Supabase. Every database read/write in the
// app goes through a function exported from here, so if data looks wrong
// or a save fails, this is the one place to look.
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { CONDITIONS } from './config.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// False when the two environment variables were not provided (see .env.example).
export const isConfigured = Boolean(url && key);
const db = isConfigured ? createClient(url, key) : null;

// Turns a Supabase { data, error } answer into data, or throws a readable error.
function check(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

const byCreated = (a, b) => String(a.created_at).localeCompare(String(b.created_at));

// ---------- sign in ----------
export async function getSession() {
  const { data } = await db.auth.getSession();
  return data.session;
}

export function onAuthChange(callback) {
  // setTimeout avoids calling the database from inside the auth callback (a known Supabase pitfall).
  db.auth.onAuthStateChange((_event, session) => setTimeout(() => callback(session), 0));
}

export async function signIn(email, password) {
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await db.auth.signOut();
}

// ---------- patients ----------
const PATIENT_SELECT = '*, patient_medications(*), short_term_treatments(*)';

function shape(p) {
  const { patient_medications, short_term_treatments, ...rest } = p;
  return {
    ...rest,
    extra_conditions: rest.extra_conditions || [],
    medications: [...(patient_medications || [])].sort(byCreated),
    shortTerm: [...(short_term_treatments || [])].sort(
      (a, b) => String(b.prescribed_on).localeCompare(String(a.prescribed_on)) || byCreated(b, a),
    ),
  };
}

export async function listPatients() {
  const rows = check(await db.from('patients').select(PATIENT_SELECT).order('created_at'), 'Loading patients');
  return rows.map(shape);
}

export async function getPatient(id) {
  const row = check(await db.from('patients').select(PATIENT_SELECT).eq('id', id).maybeSingle(), 'Loading patient');
  return row ? shape(row) : null;
}

// fields: name, phone, dob, sex, address, condition, extra_conditions, refill_every, last_given, alt_medication, alt_reason
// medications: [{ medication, strength, form, dose }]  (may be empty)
export async function createPatient(fields, medications) {
  const patient = check(await db.from('patients').insert(fields).select().single(), 'Saving patient');
  try {
    if (medications.length) {
      check(
        await db.from('patient_medications').insert(medications.map((m) => ({ ...m, patient_id: patient.id }))),
        'Saving medication',
      );
    }
    if (fields.last_given) {
      const given = medications.map((m) => m.medication + (m.strength ? ' ' + m.strength : '')).join(' + ');
      check(
        await db.from('dispenses').insert({
          patient_id: patient.id,
          dispensed_on: fields.last_given,
          alternative: fields.alt_medication || '',
          medications_given: given,
        }),
        'Recording dispense',
      );
    }
  } catch (err) {
    await db.from('patients').delete().eq('id', patient.id); // do not leave a half-saved patient behind
    throw err;
  }
  return patient;
}

export async function updatePatient(id, fields) {
  check(await db.from('patients').update(fields).eq('id', id), 'Updating patient');
}

// Replaces the patient's additional chronic conditions (the main one is patients.condition).
export async function setExtraConditions(id, list) {
  check(await db.from('patients').update({ extra_conditions: list }).eq('id', id), 'Saving conditions');
}

export async function deletePatient(id) {
  check(await db.from('patients').delete().eq('id', id), 'Deleting patient');
}

// ---------- regular medication ----------
export async function addMedication(patientId, med) {
  check(await db.from('patient_medications').insert({ ...med, patient_id: patientId }), 'Saving medication');
}

export async function removeMedication(id) {
  check(await db.from('patient_medications').delete().eq('id', id), 'Removing medication');
}

// ---------- dispensing ----------
export async function listDispenses(patientId) {
  return check(
    await db.from('dispenses').select('*').eq('patient_id', patientId)
      .order('dispensed_on', { ascending: false }).order('created_at', { ascending: false }),
    'Loading dispense history',
  );
}

export async function countSubstitutionsSince(isoDate) {
  const { count, error } = await db.from('dispenses')
    .select('id', { count: 'exact', head: true })
    .gte('dispensed_on', isoDate)
    .neq('alternative', '');
  if (error) throw new Error(`Counting substitutions: ${error.message}`);
  return count || 0;
}

// opts: { date, newMedications, refillEvery, alternative, reason, shortTerm }
//  - newMedications: [{ medication, strength, form, dose }] chosen in the window for conditions
//    that have no medication on file yet (may be empty when the patient already has medication)
//  - refillEvery is only used when the patient has no medication yet
//  - alternative is '' when no substitute was given
//  - shortTerm is optional: { medication, strength, form, dose, condition, days }
export async function recordDispense(patient, opts) {
  let meds = patient.medications;
  const firstTime = meds.length === 0;
  const added = opts.newMedications || [];
  if (firstTime && !added.length) throw new Error('Select a medication for at least one condition.');
  if (added.length) {
    const rows = check(
      await db.from('patient_medications').insert(added.map((m) => ({ ...m, patient_id: patient.id }))).select(),
      'Saving medication',
    );
    meds = [...meds, ...[...rows].sort(byCreated)];
  }
  const given = meds.map((m) => m.medication + (m.strength ? ' ' + m.strength : '')).join(' + ');
  check(
    await db.from('dispenses').insert({
      patient_id: patient.id,
      dispensed_on: opts.date,
      alternative: opts.alternative || '',
      medications_given: given,
    }),
    'Recording dispense',
  );
  const patch = {
    last_given: opts.date,
    alt_medication: opts.alternative || '',
    alt_reason: opts.alternative ? opts.reason || '' : '',
  };
  if (firstTime && opts.refillEvery) patch.refill_every = opts.refillEvery;
  check(await db.from('patients').update(patch).eq('id', patient.id), 'Updating patient');
  if (opts.shortTerm) await addShortTerm(patient.id, { ...opts.shortTerm, prescribed_on: opts.date });
}

// ---------- short-term treatments ----------
// t: { prescribed_on, medication, strength, form, dose, condition, days }
export async function addShortTerm(patientId, t) {
  check(await db.from('short_term_treatments').insert({ ...t, patient_id: patientId }), 'Saving short-term treatment');
}

export async function removeShortTerm(id) {
  check(await db.from('short_term_treatments').delete().eq('id', id), 'Removing short-term treatment');
}

// ---------- pharmacist notes ----------
export async function listNotes(patientId) {
  return check(
    await db.from('notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
    'Loading notes',
  );
}

export async function addNote(patientId, body) {
  check(await db.from('notes').insert({ patient_id: patientId, body }), 'Saving note');
}

export async function removeNote(id) {
  check(await db.from('notes').delete().eq('id', id), 'Removing note');
}

// ---------- medication catalog (the Medications page) ----------
// Returns { [condition]: { meds: [{id,name,strengths}], alts: [{id,name,strengths}] } }
export async function listCatalog() {
  const rows = check(await db.from('medication_catalog').select('*').order('sort_order'), 'Loading medication list');
  const catalog = {};
  CONDITIONS.forEach((c) => { catalog[c] = { meds: [], alts: [] }; });
  rows.forEach((r) => {
    if (!catalog[r.condition]) catalog[r.condition] = { meds: [], alts: [] };
    const entry = { id: r.id, name: r.name, strengths: r.strengths || [] };
    (r.kind === 'medication' ? catalog[r.condition].meds : catalog[r.condition].alts).push(entry);
  });
  return catalog;
}

export async function addCatalogRow(condition, kind) {
  check(await db.from('medication_catalog').insert({ condition, kind, name: '', strengths: [] }), 'Adding medication');
}

export async function updateCatalogRow(id, { name, strengths }) {
  check(await db.from('medication_catalog').update({ name, strengths }).eq('id', id), 'Saving medication');
}

export async function deleteCatalogRow(id) {
  check(await db.from('medication_catalog').delete().eq('id', id), 'Removing medication');
}
