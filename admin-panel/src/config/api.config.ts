const normalizeBase = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL =
  normalizeBase(import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4000/api');

export const OPERATOR_API_BASE_URL = (() => {
  const explicitOperatorBase = import.meta.env.VITE_OPERATOR_API_BASE_URL?.trim();
  const gatewayBase = import.meta.env.VITE_API_GATEWAY_BASE_URL?.trim();

  if (explicitOperatorBase) {
    return normalizeBase(explicitOperatorBase);
  }

  if (gatewayBase) {
    const normalizedGatewayBase = normalizeBase(gatewayBase);
    return normalizedGatewayBase.endsWith('/api')
      ? normalizedGatewayBase
      : `${normalizedGatewayBase}/api`;
  }

  return 'http://localhost:4000/api';
})();
