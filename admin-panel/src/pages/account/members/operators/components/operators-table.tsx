import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router';

import {
  AlertCircle,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircleIcon,
  MoreVertical,
  RefreshCcw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Button,
} from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Input,
} from '@/components/ui/input';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Textarea,
} from '@/components/ui/textarea';

import {
  approveOperator,
  getOperatorById,
  listOperators,
  OperatorItem,
  OperatorStatus,
  rejectOperator,
} from '../services/operator-api';

/*
 * =====================================================
 * STATUS BADGE
 * =====================================================
 */

function statusVariant(
  status: OperatorStatus,
) {
  switch (status) {
    case 'APPROVED':
      return 'success' as const;

    case 'PENDING':
      return 'warning' as const;

    case 'REJECTED':
      return 'destructive' as const;

    case 'SUSPENDED':
      return 'secondary' as const;

    default:
      return 'secondary' as const;
  }
}

/*
 * =====================================================
 * DATE FORMATTER
 * =====================================================
 */

function formatDate(
  value: string,
) {
  if (!value) {
    return '-';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '-';
  }

  return date.toLocaleString();
}

/*
 * =====================================================
 * FILE SIZE FORMATTER
 * =====================================================
 */

function formatFileSize(
  size: number,
) {
  if (!size) {
    return '-';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

/*
 * =====================================================
 * DOCUMENT NAME
 * =====================================================
 */

function getDocumentLabel(
  type: string,
) {
  switch (type) {
    case 'PAN_CARD':
      return 'PAN Card';

    case 'OWNER_ID_PROOF':
      return 'Owner ID Proof';

    case 'BANK_PROOF':
      return 'Bank Proof';

    case 'BUSINESS_REGISTRATION':
      return 'Business Registration';

    case 'GST_CERTIFICATE':
      return 'GST Certificate';

    default:
      return type
        .replaceAll('_', ' ')
        .replace(
          /\b\w/g,
          (char) =>
            char.toUpperCase(),
        );
  }
}

/*
 * =====================================================
 * INFO ROW
 * =====================================================
 */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value:
    React.ReactNode;
}) {
  return (
    <div
      className="
        border-b
        border-border
        py-3
        last:border-b-0
      "
    >
      <p
        className="
          mb-1
          text-xs
          text-muted-foreground
        "
      >
        {label}
      </p>

      <div
        className="
          break-words
          text-sm
          font-medium
        "
      >
        {value || '-'}
      </div>
    </div>
  );
}

/*
 * =====================================================
 * COMPONENT
 * =====================================================
 */

export function OperatorsTable() {
  const [
    items,
    setItems,
  ] =
    useState<
      OperatorItem[]
    >([]);

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    isActionLoading,
    setIsActionLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    selectedOperatorId,
    setSelectedOperatorId,
  ] =
    useState<
      string | null
    >(null);

  const [
    selectedOperator,
    setSelectedOperator,
  ] =
    useState<
      OperatorItem | null
    >(null);

  const [
    isReviewOpen,
    setIsReviewOpen,
  ] =
    useState(false);

  const [
    isApproveOpen,
    setIsApproveOpen,
  ] =
    useState(false);

  const [
    isRejectOpen,
    setIsRejectOpen,
  ] =
    useState(false);

  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState('');

  /*
   * =====================================================
   * LOAD OPERATORS
   * =====================================================
   */

  async function loadOperators(
    currentSearch = '',
  ) {
    try {
      setIsLoading(true);

      setError(null);

      const result =
        await listOperators(
          currentSearch,
        );

      setItems(
        result.items || [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load operators.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    void loadOperators();
  }, []);

  /*
   * =====================================================
   * OPEN REVIEW
   * =====================================================
   */

  async function openReview(
    id: string,
  ) {
    setSelectedOperatorId(
      id,
    );

    setSelectedOperator(
      null,
    );

    setIsReviewOpen(
      true,
    );

    setError(null);

    try {
      setIsActionLoading(
        true,
      );

      const operator =
        await getOperatorById(
          id,
        );

      setSelectedOperator(
        operator,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load operator.',
      );
    } finally {
      setIsActionLoading(
        false,
      );
    }
  }

  /*
   * =====================================================
   * APPROVE
   * =====================================================
   */

  async function confirmApprove() {
    if (
      !selectedOperatorId
    ) {
      return;
    }

    try {
      setIsActionLoading(
        true,
      );

      setError(null);

      const updated =
        await approveOperator(
          selectedOperatorId,
        );

      setSelectedOperator(
        updated,
      );

      setIsApproveOpen(
        false,
      );

      setIsReviewOpen(
        false,
      );

      setSuccessMessage(
        'Operator application approved successfully.',
      );

      await loadOperators(
        search,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to approve operator.',
      );
    } finally {
      setIsActionLoading(
        false,
      );
    }
  }

  /*
   * =====================================================
   * REJECT
   * =====================================================
   */

  async function confirmReject() {
    if (
      !selectedOperatorId
    ) {
      return;
    }

    if (
      !rejectionReason.trim()
    ) {
      setError(
        'Please enter a rejection reason.',
      );

      return;
    }

    try {
      setIsActionLoading(
        true,
      );

      setError(null);

      const updated =
        await rejectOperator(
          selectedOperatorId,
          rejectionReason,
        );

      setSelectedOperator(
        updated,
      );

      setIsRejectOpen(
        false,
      );

      setIsReviewOpen(
        false,
      );

      setRejectionReason('');

      setSuccessMessage(
        'Operator application rejected.',
      );

      await loadOperators(
        search,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reject operator.',
      );
    } finally {
      setIsActionLoading(
        false,
      );
    }
  }

  /*
   * =====================================================
   * EMPTY STATE
   * =====================================================
   */

  const emptyStateMessage =
    useMemo(() => {
      if (search.trim()) {
        return (
          'No operators match your search.'
        );
      }

      return (
        'No operators found yet.'
      );
    }, [search]);

  return (
    <Card>

      {/* =================================================
          HEADER
      ================================================= */}

      <CardHeader
        className="
          gap-3
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <CardTitle>
          Operators
        </CardTitle>

        <div
          className="
            flex
            w-full
            flex-col
            gap-2
            md:w-auto
            md:flex-row
          "
        >
          <div
            className="relative"
          >
            <Search
              className="
                absolute
                left-3
                top-1/2
                size-4
                -translate-y-1/2
                text-muted-foreground
              "
            />

            <Input
              value={search}

              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }

              onKeyDown={(
                event,
              ) => {
                if (
                  event.key ===
                  'Enter'
                ) {
                  void loadOperators(
                    search,
                  );
                }
              }}

              placeholder="Search operators"

              className="
                pl-9
                md:w-64
              "
            />
          </div>

          <Button
            variant="outline"

            disabled={
              isLoading
            }

            onClick={() =>
              void loadOperators(
                search,
              )
            }
          >
            {isLoading ? (
              <LoaderCircleIcon
                className="
                  size-4
                  animate-spin
                "
              />
            ) : (
              <RefreshCcw
                className="size-4"
              />
            )}

            Refresh
          </Button>

          <Button asChild>
            <Link
              to="/account/members/add-operator"
            >
              Add Operator
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <Alert
            variant="destructive"
            appearance="light"
            className="mb-4"
            onClose={() =>
              setError(null)
            }
          >
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>

            <AlertTitle>
              {error}
            </AlertTitle>
          </Alert>
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {successMessage && (
          <Alert
            appearance="light"
            className="mb-4"
            onClose={() =>
              setSuccessMessage(
                null,
              )
            }
          >
            <AlertIcon>
              <CheckCircle2 />
            </AlertIcon>

            <AlertTitle>
              {successMessage}
            </AlertTitle>
          </Alert>
        )}

        {/* =================================================
            TABLE
        ================================================= */}

        <Table>
          <TableHeader>
            <TableRow>

              <TableHead>
                Operator Name
              </TableHead>

              <TableHead>
                Owner Name
              </TableHead>

              <TableHead>
                Mobile
              </TableHead>

              <TableHead>
                Email
              </TableHead>

              <TableHead>
                Status
              </TableHead>

              <TableHead>
                Created At
              </TableHead>

              <TableHead
                className="
                  w-[80px]
                  text-right
                "
              >
                Action
              </TableHead>

            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-center
                      gap-2
                      py-8
                      text-muted-foreground
                    "
                  >
                    <LoaderCircleIcon
                      className="
                        size-4
                        animate-spin
                      "
                    />

                    Loading operators...
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="
                    py-8
                    text-center
                    text-muted-foreground
                  "
                >
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map(
                (operator) => (
                  <TableRow
                    key={
                      operator.id
                    }
                  >

                    <TableCell>
                      {
                        operator.operatorName
                      }
                    </TableCell>

                    <TableCell>
                      {
                        operator.ownerName ||
                        '-'
                      }
                    </TableCell>

                    <TableCell>
                      {
                        operator.mobile
                      }
                    </TableCell>

                    <TableCell>
                      {
                        operator.email ||
                        '-'
                      }
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={statusVariant(
                          operator.status,
                        )}
                        appearance="light"
                      >
                        {
                          operator.status
                        }
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        operator.createdAt,
                      )}
                    </TableCell>

                    <TableCell
                      className="text-right"
                    >
                      <DropdownMenu>

                        <DropdownMenuTrigger
                          asChild
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                          >
                            <MoreVertical
                              className="size-4"
                            />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                        >

                          <DropdownMenuItem
                            onClick={() =>
                              void openReview(
                                operator.id,
                              )
                            }
                          >
                            {operator.status ===
                            'PENDING'
                              ? 'Review Application'
                              : 'View Details'}
                          </DropdownMenuItem>

                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>

        {/* =================================================
            REVIEW APPLICATION
        ================================================= */}

        <Dialog
          open={isReviewOpen}

          onOpenChange={(
            open,
          ) => {
            setIsReviewOpen(
              open,
            );

            if (!open) {
              setSelectedOperator(
                null,
              );

              setSelectedOperatorId(
                null,
              );

              setError(null);
            }
          }}
        >
          <DialogContent
            className="
              max-h-[90vh]
              max-w-5xl
              overflow-hidden
            "
          >

            <DialogHeader>

              <DialogTitle>
                Operator Application Review
              </DialogTitle>

              <DialogDescription>
                Review the submitted business,
                banking, tax and document
                information before making a
                decision.
              </DialogDescription>

            </DialogHeader>

            <DialogBody
              className="
                max-h-[70vh]
                overflow-y-auto
              "
            >
              {isActionLoading &&
              !selectedOperator ? (
                <div
                  className="
                    flex
                    min-h-48
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <LoaderCircleIcon
                    className="
                      size-5
                      animate-spin
                    "
                  />

                  Loading application...
                </div>
              ) : selectedOperator ? (
                <div
                  className="
                    space-y-6
                  "
                >

                  {/* STATUS */}

                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      justify-between
                      gap-3
                      rounded-lg
                      border
                      border-border
                      p-4
                    "
                  >
                    <div>
                      <p
                        className="
                          text-sm
                          text-muted-foreground
                        "
                      >
                        Application Status
                      </p>

                      <p
                        className="
                          mt-1
                          font-semibold
                        "
                      >
                        {
                          selectedOperator.operatorName
                        }
                      </p>
                    </div>

                    <Badge
                      variant={statusVariant(
                        selectedOperator.status,
                      )}
                      appearance="light"
                    >
                      {
                        selectedOperator.status
                      }
                    </Badge>
                  </div>

                  {/* BUSINESS */}

                  <section>
                    <div
                      className="
                        mb-3
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <Building2
                        className="size-5"
                      />

                      <h3
                        className="
                          font-semibold
                        "
                      >
                        Business & Personal Details
                      </h3>
                    </div>

                    <div
                      className="
                        grid
                        rounded-lg
                        border
                        border-border
                        px-4
                        md:grid-cols-2
                        md:gap-x-8
                      "
                    >

                      <InfoRow
                        label="Travels / Operator Name"
                        value={
                          selectedOperator.operatorName
                        }
                      />

                      <InfoRow
                        label="Legal Business Name"
                        value={
                          selectedOperator.legalName
                        }
                      />

                      <InfoRow
                        label="Owner Name"
                        value={
                          selectedOperator.ownerName
                        }
                      />

                      <InfoRow
                        label="Mobile"
                        value={
                          selectedOperator.mobile
                        }
                      />

                      <InfoRow
                        label="Email"
                        value={
                          selectedOperator.email
                        }
                      />

                      <InfoRow
                        label="Business Background"
                        value={
                          selectedOperator
                            .addressDetails
                            ?.businessBackground
                        }
                      />

                      <InfoRow
                        label="Address"
                        value={
                          selectedOperator
                            .addressDetails
                            ?.address
                        }
                      />

                      <InfoRow
                        label="City"
                        value={
                          selectedOperator
                            .addressDetails
                            ?.city
                        }
                      />

                      <InfoRow
                        label="District"
                        value={
                          selectedOperator
                            .addressDetails
                            ?.district
                        }
                      />

                      <InfoRow
                        label="State"
                        value={
                          selectedOperator
                            .addressDetails
                            ?.state
                        }
                      />

                      <InfoRow
                        label="Pincode"
                        value={
                          selectedOperator
                            .addressDetails
                            ?.pincode
                        }
                      />

                      <InfoRow
                        label="Country"
                        value={
                          selectedOperator
                            .addressDetails
                            ?.country
                        }
                      />

                      <InfoRow
                        label="Billing Address"
                        value={
                          selectedOperator
                            .addressDetails
                            ?.billingAddress
                        }
                      />

                    </div>
                  </section>

                  {/* GST */}

                  <section>
                    <div
                      className="
                        mb-3
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <ShieldCheck
                        className="size-5"
                      />

                      <h3
                        className="
                          font-semibold
                        "
                      >
                        GST & Tax Details
                      </h3>
                    </div>

                    <div
                      className="
                        grid
                        rounded-lg
                        border
                        border-border
                        px-4
                        md:grid-cols-2
                        md:gap-x-8
                      "
                    >

                      <InfoRow
                        label="GSTIN"
                        value={
                          selectedOperator.registrationNumber
                        }
                      />

                      <InfoRow
                        label="PAN Number"
                        value={
                          selectedOperator.taxIdentifier
                        }
                      />

                    </div>
                  </section>

                  {/* BANK */}

                  <section>
                    <div
                      className="
                        mb-3
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <Banknote
                        className="size-5"
                      />

                      <h3
                        className="
                          font-semibold
                        "
                      >
                        Bank Details
                      </h3>
                    </div>

                    <div
                      className="
                        grid
                        rounded-lg
                        border
                        border-border
                        px-4
                        md:grid-cols-2
                        md:gap-x-8
                      "
                    >

                      <InfoRow
                        label="Account Holder Name"
                        value={
                          selectedOperator.bank
                            ?.accountHolderName
                        }
                      />

                      <InfoRow
                        label="Bank Name"
                        value={
                          selectedOperator.bank
                            ?.bankName
                        }
                      />

                      <InfoRow
                        label="Account Number"
                        value={
                          selectedOperator.bank
                            ?.accountNumber
                        }
                      />

                      <InfoRow
                        label="IFSC Code"
                        value={
                          selectedOperator.bank
                            ?.ifscCode
                        }
                      />

                      <InfoRow
                        label="Branch Name"
                        value={
                          selectedOperator.bank
                            ?.branchName
                        }
                      />

                    </div>
                  </section>

                  {/* DOCUMENTS */}

                  <section>
                    <div
                      className="
                        mb-3
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <FileText
                        className="size-5"
                      />

                      <h3
                        className="
                          font-semibold
                        "
                      >
                        Documents
                      </h3>
                    </div>

                    <div
                      className="
                        grid
                        gap-3
                        md:grid-cols-2
                      "
                    >
                      {selectedOperator.documents &&
                      selectedOperator.documents.length >
                        0 ? (
                        selectedOperator.documents.map(
                          (
                            document,
                          ) => (
                            <div
                              key={
                                document.id
                              }
                              className="
                                rounded-lg
                                border
                                border-border
                                p-4
                              "
                            >
                              <div
                                className="
                                  flex
                                  items-start
                                  justify-between
                                  gap-3
                                "
                              >
                                <div
                                  className="
                                    flex
                                    gap-3
                                  "
                                >
                                  <div
                                    className="
                                      flex
                                      size-9
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-lg
                                      bg-muted
                                    "
                                  >
                                    <FileText
                                      className="size-4"
                                    />
                                  </div>

                                  <div>
                                    <p
                                      className="
                                        font-medium
                                      "
                                    >
                                      {getDocumentLabel(
                                        document.documentType,
                                      )}
                                    </p>

                                    <p
                                      className="
                                        mt-1
                                        break-all
                                        text-xs
                                        text-muted-foreground
                                      "
                                    >
                                      {
                                        document.originalFileName
                                      }
                                    </p>

                                    <p
                                      className="
                                        mt-1
                                        text-xs
                                        text-muted-foreground
                                      "
                                    >
                                      {formatFileSize(
                                        document.fileSize,
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <Badge
                                  variant={
                                    document.verificationStatus ===
                                    'APPROVED'
                                      ? 'success'
                                      : document.verificationStatus ===
                                          'REJECTED'
                                        ? 'destructive'
                                        : 'warning'
                                  }
                                  appearance="light"
                                >
                                  {
                                    document.verificationStatus
                                  }
                                </Badge>
                              </div>
                            </div>
                          ),
                        )
                      ) : (
                        <div
                          className="
                            col-span-full
                            rounded-lg
                            border
                            border-dashed
                            border-border
                            p-6
                            text-center
                            text-sm
                            text-muted-foreground
                          "
                        >
                          No documents available.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* APPLICATION INFORMATION */}

                  <section>
                    <div
                      className="
                        grid
                        rounded-lg
                        border
                        border-border
                        px-4
                        md:grid-cols-2
                        md:gap-x-8
                      "
                    >
                      <InfoRow
                        label="Application ID"
                        value={
                          <span
                            className="
                              break-all
                              font-mono
                              text-xs
                            "
                          >
                            {
                              selectedOperator.id
                            }
                          </span>
                        }
                      />

                      <InfoRow
                        label="Submitted At"
                        value={
                          formatDate(
                            selectedOperator.createdAt,
                          )
                        }
                      />

                      {selectedOperator.approvedAt && (
                        <InfoRow
                          label="Approved At"
                          value={
                            formatDate(
                              selectedOperator.approvedAt,
                            )
                          }
                        />
                      )}
                    </div>
                  </section>

                </div>
              ) : (
                <div
                  className="
                    py-10
                    text-center
                    text-muted-foreground
                  "
                >
                  Application information unavailable.
                </div>
              )}
            </DialogBody>

            {selectedOperator && (
              <DialogFooter
                className="
                  border-t
                  border-border
                  pt-4
                "
              >
                <Button
                  variant="outline"

                  onClick={() =>
                    setIsReviewOpen(
                      false,
                    )
                  }
                >
                  Close
                </Button>

                {selectedOperator.status ===
                  'PENDING' && (
                  <>
                    <Button
                      variant="destructive"

                      onClick={() => {
                        setRejectionReason(
                          '',
                        );

                        setIsRejectOpen(
                          true,
                        );
                      }}
                    >
                      <XCircle
                        className="size-4"
                      />

                      Reject Application
                    </Button>

                    <Button
                      onClick={() =>
                        setIsApproveOpen(
                          true,
                        )
                      }
                    >
                      <Check
                        className="size-4"
                      />

                      Approve Application
                    </Button>
                  </>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* =================================================
            APPROVE CONFIRMATION
        ================================================= */}

        <AlertDialog
          open={isApproveOpen}

          onOpenChange={
            setIsApproveOpen
          }
        >
          <AlertDialogContent>

            <AlertDialogHeader>

              <AlertDialogTitle>
                Approve Operator Application?
              </AlertDialogTitle>

              <AlertDialogDescription>
                This will approve the operator
                registration and allow the
                operator to access the dashboard.
              </AlertDialogDescription>

            </AlertDialogHeader>

            <AlertDialogFooter>

              <AlertDialogCancel>
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={() =>
                  void confirmApprove()
                }

                disabled={
                  isActionLoading
                }
              >
                {isActionLoading ? (
                  <>
                    <LoaderCircleIcon
                      className="
                        size-4
                        animate-spin
                      "
                    />

                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      className="size-4"
                    />

                    Approve
                  </>
                )}
              </AlertDialogAction>

            </AlertDialogFooter>

          </AlertDialogContent>
        </AlertDialog>

        {/* =================================================
            REJECT DIALOG
        ================================================= */}

        <Dialog
          open={isRejectOpen}

          onOpenChange={(
            open,
          ) => {
            setIsRejectOpen(
              open,
            );

            if (!open) {
              setRejectionReason(
                '',
              );
            }
          }}
        >
          <DialogContent
            className="max-w-lg"
          >

            <DialogHeader>

              <DialogTitle>
                Reject Operator Application
              </DialogTitle>

              <DialogDescription>
                Enter the reason for rejecting
                this operator registration.
              </DialogDescription>

            </DialogHeader>

            <DialogBody>

              <Textarea
                value={
                  rejectionReason
                }

                onChange={(
                  event,
                ) =>
                  setRejectionReason(
                    event.target.value,
                  )
                }

                placeholder="Enter rejection reason..."

                rows={5}
              />

              <p
                className="
                  mt-2
                  text-xs
                  text-muted-foreground
                "
              >
                The reason should clearly explain
                what needs to be corrected.
              </p>

            </DialogBody>

            <DialogFooter>

              <Button
                variant="outline"

                onClick={() =>
                  setIsRejectOpen(
                    false,
                  )
                }
              >
                Cancel
              </Button>

              <Button
                variant="destructive"

                disabled={
                  isActionLoading ||
                  !rejectionReason.trim()
                }

                onClick={() =>
                  void confirmReject()
                }
              >
                {isActionLoading ? (
                  <>
                    <LoaderCircleIcon
                      className="
                        size-4
                        animate-spin
                      "
                    />

                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle
                      className="size-4"
                    />

                    Reject Application
                  </>
                )}
              </Button>

            </DialogFooter>

          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
}