const { ApiError } = require('../errors');

function invalid(message, details = null) {
  throw new ApiError({ code: 'validation_error', message, details, status: 422 });
}

function string(value, name, { required = true, min = 1, max = 500, pattern = null, transform = null } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) invalid(`${name} is required.`);
    return null;
  }
  let result = String(value).trim();
  if (result.length < min || result.length > max) invalid(`${name} must be between ${min} and ${max} characters.`);
  if (pattern && !pattern.test(result)) invalid(`${name} has an invalid format.`);
  if (transform) result = transform(result);
  return result;
}

function uuid(value, name = 'ID', required = true) {
  const result = string(value, name, { required, min: 36, max: 36 });
  if (result === null) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) invalid(`${name} must be a valid UUID.`);
  return result;
}

function indianMobile(value, name = 'Mobile number', required = true) {
  if ((value === undefined || value === null || String(value).trim() === '') && !required) return null;
  const digits = String(value || '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(digits)) invalid(`${name} must be a valid 10-digit Indian mobile number.`);
  return digits;
}

function email(value, name = 'Email', required = false) {
  if ((value === undefined || value === null || String(value).trim() === '') && !required) return null;
  const result = String(value || '').trim().toLowerCase();
  if (result.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(result)) invalid(`Enter a valid ${name.toLowerCase()}.`);
  return result;
}

function enumValue(value, name, allowed, required = true) {
  const result = string(value, name, { required, min: 1, max: 80 });
  if (result === null) return null;
  if (!allowed.includes(result)) invalid(`${name} must be one of: ${allowed.join(', ')}.`);
  return result;
}

function futureDate(value, name = 'Date', required = false) {
  if ((value === undefined || value === null || String(value).trim() === '') && !required) return null;
  const result = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) invalid(`${name} must use YYYY-MM-DD format.`);
  const date = new Date(`${result}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) invalid(`${name} is invalid.`);
  const today = new Date(); today.setUTCHours(0,0,0,0);
  if (date.getTime() < today.getTime()) invalid(`${name} cannot be in the past.`);
  return result;
}

function token(value, name = 'Token') {
  const result = string(value, name, { required: true, min: 20, max: 512 });
  if (!/^[A-Za-z0-9._~-]+$/.test(result)) invalid(`${name} has an invalid format.`);
  return result;
}

module.exports = { invalid, string, uuid, indianMobile, email, enumValue, futureDate, token };
