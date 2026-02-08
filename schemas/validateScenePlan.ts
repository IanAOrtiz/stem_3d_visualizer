// End-to-end scene plan validation pipeline.
// Steps: lookup schema -> normalize -> structural check -> contracts.

import { getSchema } from "./schemaRegistry";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  canonicalScenePlan?: {
    concept: string;
    schemaVersion: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Validate a raw scene plan object.
 * Fails fast on missing fields, unknown schemas, normalization errors,
 * structural issues, or contract violations.
 */
export function validateScenePlan(scenePlan: any): ValidationResult {
  const errors: string[] = [];

  // 1. Verify required top-level fields.
  if (!scenePlan || typeof scenePlan !== "object") {
    return { valid: false, errors: ["scenePlan must be a non-null object."] };
  }
  if (!scenePlan.concept || typeof scenePlan.concept !== "string") {
    errors.push('Missing or invalid "concept" field.');
  }
  if (!scenePlan.schemaVersion || typeof scenePlan.schemaVersion !== "string") {
    errors.push('Missing or invalid "schemaVersion" field.');
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 2. Retrieve schema from registry.
  const schema = getSchema(scenePlan.concept, scenePlan.schemaVersion);
  if (!schema) {
    return {
      valid: false,
      errors: [`No schema registered for concept="${scenePlan.concept}" version="${scenePlan.schemaVersion}".`],
    };
  }

  // 3. Normalize parameters. Throws on unknown/missing params.
  let canonicalParams: Record<string, unknown>;
  try {
    canonicalParams = schema.normalize(scenePlan.parameters ?? {});
  } catch (e: any) {
    return { valid: false, errors: [`Normalization failed: ${e.message}`] };
  }

  // 4. Structural validation.
  const structuralErrors = schema.validateStructure(canonicalParams);
  if (structuralErrors.length > 0) {
    return { valid: false, errors: structuralErrors };
  }

  // 5. Run semantic contracts.
  for (const contract of schema.contracts) {
    const violation = contract(canonicalParams);
    if (violation) {
      errors.push(violation);
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // All checks passed.
  return {
    valid: true,
    errors: [],
    canonicalScenePlan: {
      concept: scenePlan.concept,
      schemaVersion: scenePlan.schemaVersion,
      parameters: canonicalParams,
    },
  };
}
