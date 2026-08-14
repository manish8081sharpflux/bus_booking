function required(name, options = {}) {
  const value = process.env[name];
  const productionOnly = options.productionOnly !== false;
  if ((!productionOnly || process.env.NODE_ENV === 'production') && (!value || !String(value).trim())) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireStrongSecret(name, minLength = 32) {
  const value = required(name);
  if (process.env.NODE_ENV === 'production' && String(value).length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters in production.`);
  }
  if (process.env.NODE_ENV === 'production' && ['change-me','secret','password','development'].includes(String(value).toLowerCase())) {
    throw new Error(`${name} uses an unsafe production value.`);
  }
  return value;
}

function validateProductionEnv({ service, requiredVars = [], secretVars = [] } = {}) {
  if (process.env.NODE_ENV !== 'production') return true;
  requiredVars.forEach((name) => required(name));
  secretVars.forEach((name) => requireStrongSecret(name));
  if (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.includes('*')) {
    throw new Error(`${service || 'service'}: wildcard ALLOWED_ORIGINS is forbidden in production.`);
  }
  return true;
}

module.exports = { required, requireStrongSecret, validateProductionEnv };
