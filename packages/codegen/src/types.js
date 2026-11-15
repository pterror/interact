/**
 * Questions the generator asks about a TypeScript type
 */

import ts from 'typescript'

/**
 * A type's members: a union's, or the type itself
 * @param {ts.Type} type - The type
 * @returns {readonly ts.Type[]} Its members
 */
function membersOf(type) {
  return type.isUnion() ? type.types : [type]
}

/**
 * Whether every member of a type has one of some flags
 * @param {ts.Type} type - The type
 * @param {ts.TypeFlags} flags - The flags
 * @returns {boolean} Whether all do
 */
function all(type, flags) {
  return membersOf(type).every((member) => (member.flags & flags) !== 0)
}

/**
 * Whether some member of a type has one of some flags
 * @param {ts.Type} type - The type
 * @param {ts.TypeFlags} flags - The flags
 * @returns {boolean} Whether any does
 */
function some(type, flags) {
  return membersOf(type).some((member) => (member.flags & flags) !== 0)
}

/**
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether it is a boolean
 */
function isBoolean(type) {
  return all(type, ts.TypeFlags.BooleanLike)
}

/**
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether it is a number
 */
function isNumber(type) {
  return all(type, ts.TypeFlags.NumberLike)
}

/**
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether it is a string
 */
function isString(type) {
  return all(type, ts.TypeFlags.StringLike)
}

/**
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether `null` is among its values
 */
function hasNull(type) {
  return some(type, ts.TypeFlags.Null)
}

/**
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether `undefined` is among its values
 */
function hasUndefined(type) {
  return some(type, ts.TypeFlags.Undefined | ts.TypeFlags.Void)
}

/**
 * Whether a type's values are all primitives: numbers, strings, booleans, `null`, `undefined`
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether they are
 */
function isPrimitive(checker, type) {
  const constrained = membersOf(type).map((member) =>
    (member.flags & ts.TypeFlags.TypeParameter) === 0 ? member : (checker.getBaseConstraintOfType(member) ?? member),
  )
  return constrained.every((member) =>
    all(
      member,
      ts.TypeFlags.NumberLike |
        ts.TypeFlags.StringLike |
        ts.TypeFlags.BooleanLike |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.Never,
    ),
  )
}

/**
 * The type with `null` and `undefined` taken out
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {ts.Type} The type without them
 */
function nonNullable(checker, type) {
  return checker.getNonNullableType(type)
}

/**
 * @param {ts.Type} type - The type
 * @returns {type is ts.TypeReference} Whether it is a generic type applied to arguments
 */
function isReference(type) {
  return 'target' in type && 'objectFlags' in type
}

/**
 * The type arguments of an array or tuple type
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {readonly ts.Type[]} Its arguments, none if it has none
 */
function typeArguments(checker, type) {
  return isReference(type) ? checker.getTypeArguments(type) : []
}

/**
 * The element type of an array type, or `null` if it isn't one
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {ts.Type | null} The element type
 */
function elementOf(checker, type) {
  const target = nonNullable(checker, type)
  if (!checker.isArrayType(target) || (target.flags & ts.TypeFlags.Object) === 0) {
    return null
  }
  const [element] = isReference(target) ? checker.getTypeArguments(target) : []
  return element ?? null
}

/**
 * The element types of a tuple type, or `null` if it isn't one
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {readonly ts.Type[] | null} Its element types
 */
function tupleOf(checker, type) {
  if (!checker.isTupleType(type) || !isReference(type)) {
    return null
  }
  return checker.getTypeArguments(type)
}

/**
 * The names of a record type's fields
 * @param {ts.TypeChecker} checker - The checker
 * @param {ts.Type} type - The type
 * @returns {readonly string[]} The names
 */
function fieldsOf(checker, type) {
  return checker.getPropertiesOfType(checker.getApparentType(type)).map((field) => field.name)
}

/**
 * Whether a type is a function
 * @param {ts.Type} type - The type
 * @returns {boolean} Whether it has call signatures
 */
function isCallable(type) {
  return membersOf(type).some((member) => member.getCallSignatures().length > 0)
}

export {
  elementOf,
  fieldsOf,
  hasNull,
  hasUndefined,
  isBoolean,
  isCallable,
  isNumber,
  isPrimitive,
  isString,
  membersOf,
  nonNullable,
  tupleOf,
  typeArguments,
}
