import { CONDITIONS } from '../config.js';

export function uniqueConditions(values) {
  const conditions = new Map();
  values.forEach((value) => {
    const condition = String(value || '').trim();
    const key = condition.toLowerCase();
    if (condition && !conditions.has(key)) conditions.set(key, condition);
  });
  return [...conditions.values()];
}

export function patientConditions(patient) {
  const values = Array.isArray(patient?.conditions) && patient.conditions.length
    ? patient.conditions
    : [patient?.condition];

  return uniqueConditions(values);
}

export function hasCondition(patient, condition) {
  return patientConditions(patient).includes(condition);
}

export function hasOtherCondition(patient) {
  return patientConditions(patient).some((condition) => !CONDITIONS.includes(condition));
}