/**
 * validate.js — Central validation helper using Zod schemas.
 *
 * validateInsert THROWS on invalid data (fixes BUG-B).
 * Previously the app only warned — invalid data silently reached the DB.
 */

/**
 * Validate and clean a payload against a Zod schema.
 * Returns the cleaned data (strips unknown fields).
 * @param {import('zod').ZodType} schema
 * @param {unknown} data
 * @returns {unknown} cleaned, validated data
 * @throws {Error} if validation fails
 */
export function validateInsert(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(
      `Validation failed: ${firstIssue.path.join('.')} — ${firstIssue.message}`
    );
  }
  return result.data;
}

/**
 * Validate without throwing. Returns { valid, data, errors }.
 * Use for form validation where you want to show all errors at once.
 * @param {import('zod').ZodType} schema
 * @param {unknown} data
 * @returns {{ valid: boolean, data: unknown, errors: Record<string, string> }}
 */
export function validateForm(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, data: result.data, errors: {} };
  }
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, data: null, errors };
}
