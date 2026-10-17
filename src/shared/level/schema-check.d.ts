/** Types for the generated standalone level/0.2 schema validator (tools/editor/build_schema_check.mjs). */
export interface SchemaError { instancePath: string; message?: string }
declare const validate: ((data: unknown) => boolean) & { errors?: SchemaError[] | null };
export default validate;
export { validate };
