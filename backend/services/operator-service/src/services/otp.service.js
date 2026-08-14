const crypto = require('crypto');
const smsService = require('./sms.service');
const redis = require('../infrastructure/cache/redis.client');
const {
  OTP_TTL_SECONDS,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_VERIFIED_WINDOW_MINUTES,
  OTP_VERIFY_REQUIRED
} = require('../config/env');

class OtpService {
  async sendOtp({ mobile }) {
    const normalizedMobile = this.normalizeMobile(mobile);
    const existing = await this.getRecord(normalizedMobile);
    const now = Date.now();

    if (existing?.lastSentAt && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      const secondsLeft = Math.ceil((OTP_RESEND_COOLDOWN_SECONDS * 1000 - (now - existing.lastSentAt)) / 1000);
      throw new Error(`Please wait ${secondsLeft}s before requesting another OTP`);
    }

    const otp = smsService.generateOtp();
    const sendResult = await smsService.sendOtpAsync(normalizedMobile, otp);
    if (!sendResult.success) {
      throw new Error('Failed to send OTP via SMS gateway');
    }

    await this.setRecord(normalizedMobile, {
      otpHash: this.hashOtp(otp),
      expiresAt: now + OTP_TTL_SECONDS * 1000,
      attempts: 0,
      lastSentAt: now,
      verifiedAt: null
    });

    return {
      mobile: normalizedMobile,
      expiresInSeconds: OTP_TTL_SECONDS,
      providerResponse: sendResult.providerResponse
    };
  }

  async verifyOtp({ mobile, otp }) {
    const normalizedMobile = this.normalizeMobile(mobile);
    const normalizedOtp = String(otp || '').trim();
    if (!/^\d{4}$/.test(normalizedOtp)) {
      throw new Error('OTP must be a 4-digit code');
    }

    const record = await this.getRecord(normalizedMobile);
    if (!record) {
      throw new Error('OTP not found. Please request a new OTP');
    }

    const now = Date.now();
    if (record.expiresAt <= now) {
      await this.deleteRecord(normalizedMobile);
      throw new Error('OTP expired. Please request a new OTP');
    }

    if (record.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      await this.deleteRecord(normalizedMobile);
      throw new Error('Maximum OTP verification attempts exceeded');
    }

    const matches = this.hashOtp(normalizedOtp) === record.otpHash;
    if (!matches) {
      record.attempts += 1;
      if (record.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
        await this.deleteRecord(normalizedMobile);
      } else {
        await this.setRecord(normalizedMobile, record);
      }
      throw new Error('Invalid OTP');
    }

    record.verifiedAt = now;
    await this.setRecord(normalizedMobile, record, OTP_VERIFIED_WINDOW_MINUTES * 60);
    return { mobile: normalizedMobile, verified: true };
  }

  async assertVerifiedForRegistration(mobile) {
    if (!OTP_VERIFY_REQUIRED) return;

    const normalizedMobile = this.normalizeMobile(mobile);
    const record = await this.getRecord(normalizedMobile);
    if (!record?.verifiedAt) {
      throw new Error('Mobile number is not verified. Please complete OTP verification');
    }

    const maxWindowMs = OTP_VERIFIED_WINDOW_MINUTES * 60 * 1000;
    if (Date.now() - record.verifiedAt > maxWindowMs) {
      await this.deleteRecord(normalizedMobile);
      throw new Error('OTP verification expired. Please verify mobile again');
    }
  }

  async consumeVerification(mobile) {
    const normalizedMobile = this.normalizeMobile(mobile);
    await this.deleteRecord(normalizedMobile);
  }

  normalizeMobile(mobile) {
    const digits = String(mobile || '')
      .split('')
      .filter((char) => /\d/.test(char))
      .join('');

    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    throw new Error('Invalid mobile number. Use 10-digit Indian mobile format');
  }

  hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
  }

  getKey(normalizedMobile) {
    return `otp:operator:${normalizedMobile}`;
  }

  async getRecord(normalizedMobile) {
    const raw = await redis.get(this.getKey(normalizedMobile));
    return raw ? JSON.parse(raw) : null;
  }

  async setRecord(normalizedMobile, record, ttlSeconds = null) {
    const ttl = Number.isFinite(ttlSeconds)
      ? ttlSeconds
      : Math.max(OTP_TTL_SECONDS, OTP_VERIFIED_WINDOW_MINUTES * 60);

    await redis.set(this.getKey(normalizedMobile), JSON.stringify(record), 'EX', ttl);
  }

  async deleteRecord(normalizedMobile) {
    await redis.del(this.getKey(normalizedMobile));
  }
}

module.exports = new OtpService();
