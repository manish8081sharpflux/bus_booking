import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  arrowBackOutline,
  checkmarkOutline,
  chevronForwardOutline,
  cloudUploadOutline,
  documentOutline,
  imageOutline,
  refreshOutline,
  trashOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
} from 'react-router-dom';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  BusDraftFiles,
  getBusDraftFiles,
  saveBusDraftFiles,
} from '../../utils/busDraftFiles';

import './AddBusDocumentsPage.css';

/*
 * =====================================================
 * TYPES
 * =====================================================
 */

interface BusDraft {
  busName: string;

  registrationNumber:
    string;

  busType: string;

  manufacturer: string;

  model: string;

  manufacturingYear:
    number | null;

  deckType:
    'SINGLE' | 'DOUBLE';

  totalSeats: number;
}

type DocumentKey =
  keyof BusDraftFiles;

type FileErrors =
  Partial<
    Record<
      DocumentKey,
      string
    >
  >;

interface FileUploadCardProps {
  label: string;

  description: string;

  required?: boolean;

  file:
    File | null;

  error?: string;

  accept: string;

  iconType:
    | 'document'
    | 'image';

  onSelect:
    (
      file:
        File | null,
    ) => void;
}

/*
 * =====================================================
 * CONSTANTS
 * =====================================================
 */

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const BUS_CREATION_STEPS = [
  'Bus Details',
  'Seat Layout',
  'Amenities',
  'Compliance',
  'Documents',
  'Review',
];

const EMPTY_FILES:
BusDraftFiles = {
  rcDocument:
    null,

  insuranceDocument:
    null,

  permitDocument:
    null,

  fitnessDocument:
    null,

  pucDocument:
    null,

  frontPhoto:
    null,

  sidePhoto:
    null,

  interiorPhoto:
    null,
};

/*
 * =====================================================
 * STEPS
 * =====================================================
 */

const BusCreationSteps = ({
  currentStep,
}: {
  currentStep:
    number;
}) => {
  return (
    <div className="documents-steps">

      {BUS_CREATION_STEPS.map(
        (
          label,
          index,
        ) => {
          const stepNumber =
            index + 1;

          const completed =
            stepNumber <
            currentStep;

          const active =
            stepNumber ===
            currentStep;

          let className =
            'documents-step';

          if (
            completed
          ) {
            className +=
              ' completed';
          }

          if (
            active
          ) {
            className +=
              ' active';
          }

          return (
            <div
              key={label}
              className={
                className
              }
            >
              <p className="documents-step-number">
                STEP {stepNumber}
              </p>

              <p className="documents-step-title">

                {label}

                {completed && (
                  <IonIcon
                    icon={
                      checkmarkOutline
                    }
                  />
                )}

              </p>

            </div>
          );
        },
      )}

    </div>
  );
};

/*
 * =====================================================
 * FILE CARD
 * =====================================================
 */

const FileUploadCard = ({
  label,
  description,
  required = false,
  file,
  error,
  accept,
  iconType,
  onSelect,
}: FileUploadCardProps) => {
  const inputId =
    `upload-${label
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-',
      )}`;

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState<
      string | null
    >(
      null,
    );

  useEffect(
    () => {
      if (
        iconType !==
          'image' ||
        !file
      ) {
        setPreviewUrl(
          null,
        );

        return;
      }

      const url =
        URL.createObjectURL(
          file,
        );

      setPreviewUrl(
        url,
      );

      return () => {
        URL.revokeObjectURL(
          url,
        );
      };
    },
    [
      file,
      iconType,
    ],
  );

  const fileSize =
    file
      ? (
          file.size /
          (
            1024 *
            1024
          )
        ).toFixed(
          2,
        )
      : null;

  return (
    <div className="document-upload-wrapper">

      <div
        className={[
          'document-upload-card',

          file
            ? 'uploaded'
            : '',

          error
            ? 'error'
            : '',
        ]
          .filter(
            Boolean,
          )
          .join(
            ' ',
          )}
      >

        <div className="document-upload-header">

          <div
            className={
              iconType ===
              'image'
                ? 'document-upload-icon photo'
                : 'document-upload-icon'
            }
          >

            <IonIcon
              icon={
                iconType ===
                'image'
                  ? imageOutline
                  : documentOutline
              }
            />

          </div>

          <div className="document-upload-title-area">

            <div className="document-upload-title-row">

              <h3>
                {label}
              </h3>

              <span
                className={
                  required
                    ? 'document-required-badge'
                    : 'document-optional-badge'
                }
              >
                {required
                  ? 'Required'
                  : 'Optional'}
              </span>

            </div>

            <p>
              {description}
            </p>

          </div>

        </div>

        {!file && (
          <label
            htmlFor={
              inputId
            }
            className="document-drop-zone"
          >

            <div className="document-drop-icon">

              <IonIcon
                icon={
                  cloudUploadOutline
                }
              />

            </div>

            <strong>
              Choose File
            </strong>

            <span>
              {iconType ===
              'image'
                ? 'JPG, PNG or WEBP • Max 5 MB'
                : 'PDF, JPG or PNG • Max 5 MB'}
            </span>

          </label>
        )}

        {file && (
          <div className="document-selected-file">

            {previewUrl &&
              iconType ===
                'image' && (
              <div className="document-image-preview">

                <img
                  src={
                    previewUrl
                  }
                  alt={
                    `${label} preview`
                  }
                />

              </div>
            )}

            <div className="document-file-status">

              <div className="document-file-success-icon">

                <IonIcon
                  icon={
                    checkmarkOutline
                  }
                />

              </div>

              <div className="document-file-info">

                <strong>
                  {file.name}
                </strong>

                <span>
                  {fileSize} MB
                </span>

              </div>

            </div>

            <div className="document-file-actions">

              <label
                htmlFor={
                  inputId
                }
                className="document-replace-button"
              >

                <IonIcon
                  icon={
                    refreshOutline
                  }
                />

                Replace

              </label>

              <button
                type="button"
                className="document-remove-button"
                onClick={() =>
                  onSelect(
                    null,
                  )
                }
              >

                <IonIcon
                  icon={
                    trashOutline
                  }
                />

                Remove

              </button>

            </div>

          </div>
        )}

        <input
          id={
            inputId
          }
          type="file"
          accept={
            accept
          }
          className="document-hidden-input"
          onChange={(
            event,
          ) => {
            const selectedFile =
              event
                .target
                .files?.[0] ??
              null;

            onSelect(
              selectedFile,
            );

            event.target.value =
              '';
          }}
        />

      </div>

      {error && (
        <p className="document-upload-error">
          {error}
        </p>
      )}

    </div>
  );
};

/*
 * =====================================================
 * PAGE
 * =====================================================
 */

const AddBusDocumentsPage:
React.FC = () => {
  const history =
    useHistory();

  const token =
    localStorage.getItem(
      'operator_access_token',
    );

  const [
    busDraft,
    setBusDraft,
  ] =
    useState<
      BusDraft | null
    >(
      null,
    );

  const [
    files,
    setFiles,
  ] =
    useState<
      BusDraftFiles
    >(
      EMPTY_FILES,
    );

  const [
    errors,
    setErrors,
  ] =
    useState<
      FileErrors
    >(
      {},
    );

  const [
    formError,
    setFormError,
  ] =
    useState('');

  const [
    restoringFiles,
    setRestoringFiles,
  ] =
    useState(
      true,
    );

  /*
   * =====================================================
   * AUTH
   * =====================================================
   */

  if (!token) {
    return (
      <Redirect
        to="/operator"
      />
    );
  }

  /*
   * =====================================================
   * LOAD DATA + INDEXEDDB FILES
   * =====================================================
   */

  useEffect(
    () => {
      let mounted =
        true;

      const loadPage =
        async () => {
          const busRaw =
            localStorage.getItem(
              'add_bus_draft',
            );

          const seatRaw =
            localStorage.getItem(
              'add_bus_seat_layout',
            );

          const amenityRaw =
            localStorage.getItem(
              'add_bus_amenities',
            );

          const complianceRaw =
            localStorage.getItem(
              'add_bus_compliance',
            );

          if (
            !busRaw ||
            !seatRaw ||
            amenityRaw ===
              null ||
            !complianceRaw
          ) {
            history.replace(
              '/operator/buses/add',
            );

            return;
          }

          try {
            const parsedBus =
              JSON.parse(
                busRaw,
              ) as BusDraft;

            if (
              mounted
            ) {
              setBusDraft(
                parsedBus,
              );
            }
          } catch {
            history.replace(
              '/operator/buses/add',
            );

            return;
          }

          try {
            const savedFiles =
              await getBusDraftFiles();

            if (
              mounted &&
              savedFiles
            ) {
              setFiles({
                ...EMPTY_FILES,
                ...savedFiles,
              });
            }
          } catch (
            error
          ) {
            console.error(
              '[documents] restore files failed',
              error,
            );

            if (
              mounted
            ) {
              setFormError(
                'Unable to restore previously selected files.',
              );
            }
          } finally {
            if (
              mounted
            ) {
              setRestoringFiles(
                false,
              );
            }
          }
        };

      void loadPage();

      return () => {
        mounted =
          false;
      };
    },
    [
      history,
    ],
  );

  /*
   * =====================================================
   * COUNTS
   * =====================================================
   */

  const uploadedCount =
    useMemo(
      () =>
        Object.values(
          files,
        ).filter(
          Boolean,
        ).length,
      [
        files,
      ],
    );

  const requiredUploadedCount =
    useMemo(
      () => {
        const requiredFiles = [
          files.rcDocument,
          files.insuranceDocument,
          files.permitDocument,
          files.fitnessDocument,
          files.frontPhoto,
          files.sidePhoto,
          files.interiorPhoto,
        ];

        return requiredFiles.filter(
          Boolean,
        ).length;
      },
      [
        files,
      ],
    );

  /*
   * =====================================================
   * VALIDATE SINGLE FILE
   * =====================================================
   */

  const validateFile = (
    file:
      File | null,

    type:
      | 'document'
      | 'image',
  ): string | null => {
    if (!file) {
      return null;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return (
        'File size cannot exceed 5 MB.'
      );
    }

    const allowedTypes =
      type ===
      'image'
        ? ALLOWED_IMAGE_TYPES
        : ALLOWED_DOCUMENT_TYPES;

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      return type ===
        'image'
        ? 'Only JPG, PNG or WEBP images are allowed.'
        : 'Only PDF, JPG or PNG files are allowed.';
    }

    return null;
  };

  /*
   * =====================================================
   * UPDATE FILE + SAVE INDEXEDDB
   * =====================================================
   */

  const updateFile =
    async (
      key:
        DocumentKey,

      file:
        File | null,

      type:
        | 'document'
        | 'image',
    ) => {
      const validationError =
        validateFile(
          file,
          type,
        );

      if (
        validationError
      ) {
        setErrors(
          (
            previous,
          ) => ({
            ...previous,

            [key]:
              validationError,
          }),
        );

        return;
      }

      const updatedFiles:
        BusDraftFiles = {
          ...files,

          [key]:
            file,
        };

      setFiles(
        updatedFiles,
      );

      setErrors(
        (
          previous,
        ) => ({
          ...previous,

          [key]:
            undefined,
        }),
      );

      setFormError('');

      try {
        await saveBusDraftFiles(
          updatedFiles,
        );
      } catch (
        error
      ) {
        console.error(
          '[documents] save file failed',
          error,
        );

        setFormError(
          'The file was selected, but it could not be saved locally. Please try again.',
        );
      }
    };

  /*
   * =====================================================
   * VALIDATE PAGE
   * =====================================================
   */

  const validatePage =
    () => {
      const newErrors:
        FileErrors = {};

      if (
        !files.rcDocument
      ) {
        newErrors.rcDocument =
          'RC document is required.';
      }

      if (
        !files.insuranceDocument
      ) {
        newErrors.insuranceDocument =
          'Insurance document is required.';
      }

      if (
        !files.permitDocument
      ) {
        newErrors.permitDocument =
          'Permit document is required.';
      }

      if (
        !files.fitnessDocument
      ) {
        newErrors.fitnessDocument =
          'Fitness certificate is required.';
      }

      if (
        !files.frontPhoto
      ) {
        newErrors.frontPhoto =
          'Front photo is required.';
      }

      if (
        !files.sidePhoto
      ) {
        newErrors.sidePhoto =
          'Side photo is required.';
      }

      if (
        !files.interiorPhoto
      ) {
        newErrors.interiorPhoto =
          'Interior photo is required.';
      }

      Object.entries(
        files,
      ).forEach(
        ([
          key,
          file,
        ]) => {
          if (!file) {
            return;
          }

          const image =
            key ===
              'frontPhoto' ||
            key ===
              'sidePhoto' ||
            key ===
              'interiorPhoto';

          const error =
            validateFile(
              file,
              image
                ? 'image'
                : 'document',
            );

          if (
            error
          ) {
            newErrors[
              key as
                DocumentKey
            ] =
              error;
          }
        },
      );

      setErrors(
        newErrors,
      );

      return (
        Object.keys(
          newErrors,
        ).length ===
        0
      );
    };

  /*
   * =====================================================
   * NEXT
   * =====================================================
   */

  const handleNext =
    async () => {
      setFormError('');

      if (
        !validatePage()
      ) {
        setFormError(
          'Please upload all required documents and bus photos before continuing.',
        );

        return;
      }

      try {
        /*
         * Save actual File objects.
         */

        await saveBusDraftFiles(
          files,
        );

        /*
         * Metadata can still be useful
         * for debugging/review.
         */

        const metadata =
          Object.fromEntries(
            Object.entries(
              files,
            ).map(
              ([
                key,
                file,
              ]) => [
                key,

                file
                  ? {
                      name:
                        file.name,

                      size:
                        file.size,

                      type:
                        file.type,

                      lastModified:
                        file.lastModified,
                    }
                  : null,
              ],
            ),
          );

        localStorage.setItem(
          'add_bus_document_metadata',
          JSON.stringify(
            metadata,
          ),
        );

        history.push(
          '/operator/buses/add/review',
          {
            files,
          },
        );
      } catch (
        error
      ) {
        console.error(
          '[documents] next failed',
          error,
        );

        setFormError(
          'Unable to save the selected documents. Please try again.',
        );
      }
    };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (
    !busDraft ||
    restoringFiles
  ) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="documents-loading">

            <div className="documents-loading-spinner" />

            <p>
              Restoring documents...
            </p>

          </div>

        </IonContent>

      </IonPage>
    );
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="documents-page">

          <div className="documents-container">

            <div className="documents-header">

              <button
                type="button"
                className="documents-back-icon"
                onClick={() =>
                  history.push(
                    '/operator/buses/add/compliance',
                  )
                }
              >
                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />
              </button>

              <div>

                <p className="documents-bus-name">
                  {busDraft.busName}
                </p>

                <h1 className="documents-page-title">
                  Documents & Photos
                </h1>

                <p className="documents-page-subtitle">
                  Upload valid supporting documents
                  and clear photos of the bus.
                </p>

              </div>

            </div>

            <BusCreationSteps
              currentStep={
                5
              }
            />

            <div className="documents-upload-summary">

              <div>

                <strong>
                  Upload progress
                </strong>

                <span>
                  {
                    requiredUploadedCount
                  }
                  /7 required files uploaded
                </span>

              </div>

              <div className="documents-upload-summary-count">
                {uploadedCount}/8
              </div>

            </div>

            {/* COMPLIANCE DOCUMENTS */}

            <section className="documents-section">

              <div className="documents-section-header">

                <h2>
                  Compliance Documents
                </h2>

                <p>
                  PDF, JPG or PNG. Maximum 5 MB each.
                </p>

              </div>

              <div className="documents-grid two-columns">

                <FileUploadCard
                  label="RC Document"
                  description="Vehicle registration certificate."
                  required
                  file={
                    files.rcDocument
                  }
                  error={
                    errors.rcDocument
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                  iconType="document"
                  onSelect={(
                    file,
                  ) =>
                    void updateFile(
                      'rcDocument',
                      file,
                      'document',
                    )
                  }
                />

                <FileUploadCard
                  label="Insurance Document"
                  description="Active vehicle insurance certificate."
                  required
                  file={
                    files.insuranceDocument
                  }
                  error={
                    errors.insuranceDocument
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                  iconType="document"
                  onSelect={(
                    file,
                  ) =>
                    void updateFile(
                      'insuranceDocument',
                      file,
                      'document',
                    )
                  }
                />

                <FileUploadCard
                  label="Permit Document"
                  description="Valid bus operating permit."
                  required
                  file={
                    files.permitDocument
                  }
                  error={
                    errors.permitDocument
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                  iconType="document"
                  onSelect={(
                    file,
                  ) =>
                    void updateFile(
                      'permitDocument',
                      file,
                      'document',
                    )
                  }
                />

                <FileUploadCard
                  label="Fitness Certificate"
                  description="Valid vehicle fitness certificate."
                  required
                  file={
                    files.fitnessDocument
                  }
                  error={
                    errors.fitnessDocument
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                  iconType="document"
                  onSelect={(
                    file,
                  ) =>
                    void updateFile(
                      'fitnessDocument',
                      file,
                      'document',
                    )
                  }
                />

                <FileUploadCard
                  label="PUC Document"
                  description="Pollution certificate, if available."
                  file={
                    files.pucDocument
                  }
                  error={
                    errors.pucDocument
                  }
                  accept=".pdf,.jpg,.jpeg,.png"
                  iconType="document"
                  onSelect={(
                    file,
                  ) =>
                    void updateFile(
                      'pucDocument',
                      file,
                      'document',
                    )
                  }
                />

              </div>

            </section>

            {/* BUS PHOTOS */}

            <section className="documents-section">

              <div className="documents-section-header">

                <h2>
                  Bus Photos
                </h2>

                <p>
                  JPG, PNG or WEBP. Maximum 5 MB each.
                </p>

              </div>

              <div className="documents-grid three-columns">

                <FileUploadCard
                  label="Front Photo"
                  description="Clear front view of the bus."
                  required
                  file={
                    files.frontPhoto
                  }
                  error={
                    errors.frontPhoto
                  }
                  accept=".jpg,.jpeg,.png,.webp"
                  iconType="image"
                  onSelect={(
                    file,
                  ) =>
                    void updateFile(
                      'frontPhoto',
                      file,
                      'image',
                    )
                  }
                />

                <FileUploadCard
                  label="Side Photo"
                  description="Clear side profile of the bus."
                  required
                  file={
                    files.sidePhoto
                  }
                  error={
                    errors.sidePhoto
                  }
                  accept=".jpg,.jpeg,.png,.webp"
                  iconType="image"
                  onSelect={(
                    file,
                  ) =>
                    void updateFile(
                      'sidePhoto',
                      file,
                      'image',
                    )
                  }
                />

                <FileUploadCard
                  label="Interior Photo"
                  description="Show seats and interior condition."
                  required
                  file={
                    files.interiorPhoto
                  }
                  error={
                    errors.interiorPhoto
                  }
                  accept=".jpg,.jpeg,.png,.webp"
                  iconType="image"
                  onSelect={(
                    file,
                  ) =>
                    void updateFile(
                      'interiorPhoto',
                      file,
                      'image',
                    )
                  }
                />

              </div>

            </section>

            {formError && (
              <div className="documents-form-error">
                {formError}
              </div>
            )}

            <div className="documents-info-box">

              <div className="documents-info-icon">
                !
              </div>

              <div>

                <strong>
                  Verify before continuing
                </strong>

                <p>
                  Make sure every uploaded document
                  belongs to this vehicle and matches
                  the compliance information entered
                  in Step 4.
                </p>

              </div>

            </div>

            <div className="documents-footer">

              <button
                type="button"
                className="documents-footer-button secondary"
                onClick={() =>
                  history.push(
                    '/operator/buses/add/compliance',
                  )
                }
              >

                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />

                Back

              </button>

              <button
                type="button"
                className="documents-footer-button primary"
                onClick={() =>
                  void handleNext()
                }
              >

                Review Bus

                <IonIcon
                  icon={
                    chevronForwardOutline
                  }
                />

              </button>

            </div>

          </div>

        </div>

      </IonContent>

    </IonPage>
  );
};

export default AddBusDocumentsPage;
