const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const {
  SMS_ENABLED,
  SMS_BASE_URL,
  SMS_USER,
  SMS_PASSWORD,
  SMS_SENDER_ID,
  SMS_CHANNEL,
  SMS_DCS,
  SMS_FLASH_SMS,
  SMS_ROUTE,
  SMS_PEID,
  SMS_APP_HASH
} = require('../config/env');

class SmsService {
  generateOtp() {
    return String(crypto.randomInt(1000, 10000));
  }

  async sendOtpAsync(phoneNumber, otp) {
    if (!SMS_ENABLED) {
      console.log(`[otp-dev] SMS disabled. OTP for ${phoneNumber}: ${otp}`);
      return { success: true, providerResponse: 'SMS_DISABLED_DEV_MODE', otp };
    }

    const baseUrl = String(SMS_BASE_URL || '').trim();
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      throw new Error(`Invalid SMS_BASE_URL: '${baseUrl}'`);
    }

    const text =
      `<#> Your verification code is ${otp} ` +
      `Use this OTP to proceed with your request. Do not share it with anyone. ` +
      `Sharpflux Technologies LLP.\n ${SMS_APP_HASH}`;

    let lastResponse = '';
    for (const candidate of this.buildPhoneCandidates(phoneNumber)) {
      const queryParams = new URLSearchParams({
        user: SMS_USER,
        password: SMS_PASSWORD,
        senderid: SMS_SENDER_ID,
        channel: SMS_CHANNEL,
        DCS: SMS_DCS,
        flashsms: SMS_FLASH_SMS,
        number: candidate,
        text,
        route: SMS_ROUTE,
        PEId: SMS_PEID
      });

      const requestUrl = `${baseUrl}?${queryParams.toString()}`;
      console.log(`[sms] sending OTP to ${candidate}`);

      const { statusCode, body } = await httpGet(requestUrl);
      lastResponse = body;
      console.log(`[sms] gateway response for ${candidate} (status=${statusCode}): ${body}`);

      const { success, providerResponse } = this.parseGatewayResponse(statusCode, body);
      if (success) {
        return { success: true, providerResponse, otp };
      }
    }

    return { success: false, providerResponse: lastResponse, otp };
  }

  *buildPhoneCandidates(phoneNumber) {
    const normalized = String(phoneNumber || '')
      .split('')
      .filter((char) => /\d/.test(char))
      .join('');

    if (!normalized) return;

    const seen = new Set();
    const add = (value) => {
      if (!seen.has(value)) {
        seen.add(value);
        return true;
      }
      return false;
    };

    if (add(normalized)) yield normalized;
    if (normalized.length === 12 && normalized.startsWith('91')) {
      const local = normalized.slice(2);
      if (add(local)) yield local;
    }
    if (normalized.length === 10) {
      const countryCode = `91${normalized}`;
      if (add(countryCode)) yield countryCode;
    }
  }

  parseGatewayResponse(statusCode, content) {
    if (statusCode < 200 || statusCode >= 300) {
      return { success: false, providerResponse: content };
    }

    try {
      const parsed = JSON.parse(content);
      const errorCode = parsed?.ErrorCode;
      const errorMessage = parsed?.ErrorMessage;
      const success = errorCode === '000' && String(errorMessage || '').toLowerCase() === 'done';
      return { success, providerResponse: content };
    } catch (_error) {
      const success = String(content || '').toLowerCase().includes('done');
      return { success, providerResponse: content };
    }
  }
}

function httpGet(rawUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(rawUrl);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.get(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 500, body: data });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

module.exports = new SmsService();
