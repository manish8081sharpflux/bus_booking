import * as authHelper from '@/auth/lib/helpers';
import { OPERATOR_API_BASE_URL } from '@/config/api.config';

export type OperatorStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface OperatorAddress {
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  billingAddress?: string;
  businessBackground?: string;
}

export interface OperatorBankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
}

export interface OperatorDocument {
  id: string;
  operatorId: string;
  documentType: string;
  filePath: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  verificationStatus: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorKycStatus {
  operatorId: string;
  complete: boolean;
  required: {
    documentType: string;
    present: boolean;
    status: string;
    rejectionReason: string | null;
    documentId: string | null;
  }[];
  missing: string[];
  pending: string[];
  rejected: string[];
}
export interface OperatorItem {
  id: string;

  ownerUserId?: string;

  operatorName: string;
  legalName?: string | null;

  ownerName: string;

  mobile: string;

  email: string | null;

  address: string | null;

  addressDetails?: OperatorAddress;

  registrationNumber?: string | null;

  taxIdentifier?: string | null;

  bank?: OperatorBankDetails | null;

  documents?: OperatorDocument[];

  approvedBy?: string | null;

  approvedAt?: string | null;

  registrationFee: string | number;

  isFreeRegistration: boolean;

  status: OperatorStatus;

  createdAt: string;

  updatedAt: string;
}

export interface OperatorListResponse {
  items: OperatorItem[];

  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/*
 * =====================================================
 * AUTH HEADERS
 * =====================================================
 */

function getAuthHeaders() {
  const auth =
    authHelper.getAuth();

  const token =
    auth?.access_token;

  if (!token) {
    throw new Error(
      'You are not logged in. Please login and try again.',
    );
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}

/*
 * =====================================================
 * FORMAT ADDRESS
 * =====================================================
 */

function formatAddress(
  address: unknown,
): string | null {
  if (!address) {
    return null;
  }

  if (
    typeof address === 'string'
  ) {
    return address;
  }

  if (
    typeof address !== 'object'
  ) {
    return null;
  }

  const value =
    address as OperatorAddress;

  return [
    value.address,
    value.city,
    value.district,
    value.state,
    value.pincode,
    value.country,
  ]
    .filter(Boolean)
    .join(', ');
}

/*
 * =====================================================
 * MAP DOCUMENT
 * =====================================================
 */

function mapDocument(
  document: any,
): OperatorDocument {
  return {
    id:
      String(
        document.id ?? '',
      ),

    operatorId:
      String(
        document.operatorId ??
          document.operator_id ??
          '',
      ),

    documentType:
      document.documentType ??
      document.document_type ??
      '',

    filePath:
      document.filePath ??
      document.file_path ??
      '',

    originalFileName:
      document.originalFileName ??
      document.original_file_name ??
      '',

    mimeType:
      document.mimeType ??
      document.mime_type ??
      '',

    fileSize:
      Number(
        document.fileSize ??
          document.file_size ??
          0,
      ),

    verificationStatus:
      document.verificationStatus ??
      document.verification_status ??
      'PENDING',

    rejectionReason:
      document.rejectionReason ??
      document.rejection_reason ??
      null,

    createdAt:
      document.createdAt ??
      document.created_at ??
      '',

    updatedAt:
      document.updatedAt ??
      document.updated_at ??
      '',
  };
}

/*
 * =====================================================
 * MAP OPERATOR
 * =====================================================
 */

function mapOperator(
  operator: any,
): OperatorItem {
  const addressObject =
    operator.address &&
    typeof operator.address === 'object'
      ? operator.address as OperatorAddress
      : undefined;

  return {
    id:
      String(
        operator.id ?? '',
      ),

    ownerUserId:
      operator.ownerUserId ??
      operator.owner_user_id,

    operatorName:
      operator.operatorName ??
      operator.displayName ??
      operator.display_name ??
      operator.legalName ??
      operator.legal_name ??
      '',

    legalName:
      operator.legalName ??
      operator.legal_name ??
      null,

    ownerName:
      operator.ownerName ??
      operator.owner_name ??
      operator.ownerFullName ??
      operator.owner_full_name ??
      '',

    mobile:
      operator.mobile ??
      operator.supportMobile ??
      operator.support_mobile ??
      '',

    email:
      operator.email ??
      operator.supportEmail ??
      operator.support_email ??
      null,

    address:
      formatAddress(
        operator.address,
      ),

    addressDetails:
      addressObject,

    registrationNumber:
      operator.registrationNumber ??
      operator.registration_number ??
      null,

    taxIdentifier:
      operator.taxIdentifier ??
      operator.tax_identifier ??
      null,

    bank:
      operator.bank
        ? {
            accountHolderName:
              operator.bank.accountHolderName ??
              operator.bank.account_holder_name ??
              '',

            bankName:
              operator.bank.bankName ??
              operator.bank.bank_name ??
              '',

            accountNumber:
              operator.bank.accountNumber ??
              operator.bank.account_number ??
              '',

            ifscCode:
              operator.bank.ifscCode ??
              operator.bank.ifsc_code ??
              '',

            branchName:
              operator.bank.branchName ??
              operator.bank.branch_name ??
              '',
          }
        : null,

    documents:
      Array.isArray(
        operator.documents,
      )
        ? operator.documents.map(
            mapDocument,
          )
        : [],

    approvedBy:
      operator.approvedBy ??
      operator.approved_by ??
      null,

    approvedAt:
      operator.approvedAt ??
      operator.approved_at ??
      null,

    registrationFee:
      operator.registrationFee ??
      operator.registration_fee ??
      0,

    isFreeRegistration:
      operator.isFreeRegistration ??
      operator.is_free_registration ??
      false,

    status:
      operator.status ??
      'PENDING',

    createdAt:
      operator.createdAt ??
      operator.created_at ??
      '',

    updatedAt:
      operator.updatedAt ??
      operator.updated_at ??
      '',
  };
}

/*
 * =====================================================
 * LIST OPERATORS
 * =====================================================
 */

export async function listOperators(
  search = '',
): Promise<OperatorListResponse> {
  const response =
    await fetch(
      `${OPERATOR_API_BASE_URL}/operators`,
      {
        method: 'GET',

        headers: {
          ...getAuthHeaders(),
        },
      },
    );

  const json =
    await response.json();

  if (
    !response.ok ||
    !json.success
  ) {
    throw new Error(
      json.message ||
        'Failed to fetch operators',
    );
  }

  const rawOperators =
    Array.isArray(
      json.operators,
    )
      ? json.operators
      : [];

  let items =
    rawOperators.map(
      mapOperator,
    );

  if (search.trim()) {
    const term =
      search
        .trim()
        .toLowerCase();

    items =
      items.filter(
        (operator) =>
          operator.operatorName
            .toLowerCase()
            .includes(term) ||
          operator.ownerName
            .toLowerCase()
            .includes(term) ||
          operator.mobile
            .toLowerCase()
            .includes(term) ||
          (
            operator.email || ''
          )
            .toLowerCase()
            .includes(term),
      );
  }

  return {
    items,

    pagination: {
      total:
        Number(
          json.count ??
            items.length,
        ),

      page: 1,

      limit:
        Math.max(
          items.length,
          1,
        ),

      totalPages: 1,
    },
  };
}

/*
 * =====================================================
 * GET SINGLE OPERATOR
 * =====================================================
 */

export async function getOperatorById(
  id: string,
): Promise<OperatorItem> {
  const response =
    await fetch(
      `${OPERATOR_API_BASE_URL}/operators/${encodeURIComponent(
        id,
      )}`,
      {
        method: 'GET',

        headers: {
          ...getAuthHeaders(),
        },
      },
    );

  const json =
    await response.json();

  if (
    !response.ok ||
    !json.success ||
    !json.operator
  ) {
    throw new Error(
      json.message ||
        'Failed to fetch operator details',
    );
  }

  return mapOperator(
    json.operator,
  );
}

/*
 * =====================================================
 * APPROVE OPERATOR
 * PATCH /operators/:id/approve
 * =====================================================
 */

export async function getOperatorKycStatus(
  id: string,
): Promise<OperatorKycStatus> {
  const response = await fetch(
    `${OPERATOR_API_BASE_URL}/operators/${encodeURIComponent(id)}/kyc-status`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    },
  );

  const json = await response.json();

  if (!response.ok || !json.success || !json.kyc) {
    throw new Error(json.message || 'Failed to fetch operator KYC status');
  }

  return json.kyc as OperatorKycStatus;
}

export async function verifyOperatorDocument(
  operatorId: string,
  documentId: string,
  decision: 'APPROVED' | 'REJECTED',
  reason = '',
): Promise<OperatorKycStatus> {
  const response = await fetch(
    `${OPERATOR_API_BASE_URL}/operators/${encodeURIComponent(operatorId)}/documents/${encodeURIComponent(documentId)}/verification`,
    {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision,
        reason: reason.trim() || undefined,
      }),
    },
  );

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to verify operator document');
  }

  return json.kyc as OperatorKycStatus;
}

export async function approveOperator(
  id: string,
): Promise<OperatorItem> {
  const response =
    await fetch(
      `${OPERATOR_API_BASE_URL}/operators/${encodeURIComponent(
        id,
      )}/approve`,
      {
        method: 'PATCH',

        headers: {
          ...getAuthHeaders(),

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({}),
      },
    );

  const json =
    await response.json();

  if (
    !response.ok ||
    !json.success
  ) {
    throw new Error(
      json.message ||
        'Failed to approve operator',
    );
  }

  /*
   * Some controller implementations
   * may return only success/message.
   * Fetch the latest operator afterward.
   */
  return await getOperatorById(
    id,
  );
}

/*
 * =====================================================
 * REJECT OPERATOR
 * PATCH /operators/:id/reject
 * =====================================================
 */

export async function rejectOperator(
  id: string,
  reason: string,
): Promise<OperatorItem> {
  const response =
    await fetch(
      `${OPERATOR_API_BASE_URL}/operators/${encodeURIComponent(
        id,
      )}/reject`,
      {
        method: 'PATCH',

        headers: {
          ...getAuthHeaders(),

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            reason:
              reason.trim(),
          }),
      },
    );

  const json =
    await response.json();

  if (
    !response.ok ||
    !json.success
  ) {
    throw new Error(
      json.message ||
        'Failed to reject operator',
    );
  }

  return await getOperatorById(
    id,
  );
}

export interface RegisterOperatorPayload {
  operatorName: string;
  ownerName: string;
  mobile: string;
  email?: string;
  address?: string;
}

/*
 * =====================================================
 * SEND OTP
 * =====================================================
 */

export async function sendOperatorOtp(
  mobile: string,
): Promise<string> {
  const response = await fetch(
    `${OPERATOR_API_BASE_URL}/operators/send-otp`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        mobile: mobile.trim(),
      }),
    },
  );

  const json = await response.json();

  if (
    !response.ok ||
    !json.success
  ) {
    throw new Error(
      json.message ||
        'Failed to send OTP',
    );
  }

  return (
    json.message ||
    'OTP sent successfully.'
  );
}

/*
 * =====================================================
 * VERIFY OTP
 * =====================================================
 */

export async function verifyOperatorOtp(
  mobile: string,
  otp: string,
): Promise<string> {
  const response = await fetch(
    `${OPERATOR_API_BASE_URL}/operators/verify-otp`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        mobile: mobile.trim(),
        otp: otp.trim(),
      }),
    },
  );

  const json = await response.json();

  if (
    !response.ok ||
    !json.success
  ) {
    throw new Error(
      json.message ||
        'Failed to verify OTP',
    );
  }

  return (
    json.message ||
    'OTP verified successfully.'
  );
}

/*
 * =====================================================
 * REGISTER OPERATOR
 * =====================================================
 */

export async function registerOperator(
  payload: RegisterOperatorPayload,
): Promise<OperatorItem> {
  const response = await fetch(
    `${OPERATOR_API_BASE_URL}/operators/register`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(payload),
    },
  );

  const json = await response.json();

  if (
    !response.ok ||
    !json.success
  ) {
    throw new Error(
      json.message ||
        'Failed to register operator',
    );
  }

  /*
   * Support both the old admin response
   * and the current operator-service response.
   */
  const operator =
    json.operator ??
    json.data;

  if (!operator) {
    throw new Error(
      'Operator registered but operator data was not returned.',
    );
  }

  return mapOperator(
    operator,
  );
}