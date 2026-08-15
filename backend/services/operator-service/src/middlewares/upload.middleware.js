const multer =
  require('multer')

const path =
  require('path')

const fs =
  require('fs')

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

const ensureDirectory = (
  directory,
) => {
  if (
    !fs.existsSync(
      directory,
    )
  ) {
    fs.mkdirSync(
      directory,
      {
        recursive: true,
      },
    )
  }
}

const createFileName = (
  file,
) => {
  const uniqueName =
    `${Date.now()}-${Math.round(
      Math.random() *
        1e9,
    )}`

  const extension =
    path.extname(
      file.originalname,
    )

  return (
    `${file.fieldname}-${uniqueName}${extension}`
  )
}

/*
 * =====================================================
 * EXISTING OPERATOR UPLOAD
 * =====================================================
 */

const operatorUploadDirectory =
  path.join(
    process.cwd(),
    'uploads',
    'operators',
  )

ensureDirectory(
  operatorUploadDirectory,
)

const operatorStorage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback,
    ) => {
      callback(
        null,
        operatorUploadDirectory,
      )
    },

    filename: (
      req,
      file,
      callback,
    ) => {
      callback(
        null,
        createFileName(
          file,
        ),
      )
    },
  })

const operatorAllowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

const operatorFileFilter = (
  req,
  file,
  callback,
) => {
  if (
    operatorAllowedMimeTypes.includes(
      file.mimetype,
    )
  ) {
    callback(
      null,
      true,
    )

    return
  }

  callback(
    new Error(
      'Only PDF, JPG and PNG files are allowed.',
    ),
  )
}

const operatorUpload =
  multer({
    storage:
      operatorStorage,

    limits: {
      fileSize:
        5 *
        1024 *
        1024,
    },

    fileFilter:
      operatorFileFilter,
  })

const operatorDocumentUpload =
  operatorUpload.fields([
    {
      name:
        'panCard',
      maxCount: 1,
    },

    {
      name:
        'ownerIdProof',
      maxCount: 1,
    },

    {
      name:
        'bankProof',
      maxCount: 1,
    },

    {
      name:
        'gstCertificate',
      maxCount: 1,
    },

    {
      name:
        'businessRegistration',
      maxCount: 1,
    },
  ])

/*
 * =====================================================
 * NEW BUS UPLOAD
 * =====================================================
 */

const busUploadDirectory =
  path.join(
    process.cwd(),
    'uploads',
    'buses',
  )

ensureDirectory(
  busUploadDirectory,
)

const busStorage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback,
    ) => {
      callback(
        null,
        busUploadDirectory,
      )
    },

    filename: (
      req,
      file,
      callback,
    ) => {
      callback(
        null,
        createFileName(
          file,
        ),
      )
    },
  })

const busDocumentFields = [
  'rcDocument',
  'insuranceDocument',
  'permitDocument',
  'fitnessDocument',
  'pucDocument',
]

const busPhotoFields = [
  'frontPhoto',
  'sidePhoto',
  'interiorPhoto',
]

const busDocumentMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

const busPhotoMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

const getNormalizedExtension = (
  fileName,
) =>
  path
    .extname(
      String(
        fileName || '',
      ),
    )
    .replace(
      /^\./,
      '',
    )
    .toLowerCase()

const allowedExtensionsByMime = {
  'application/pdf': [
    'pdf',
  ],
  'image/jpeg': [
    'jpg',
    'jpeg',
  ],
  'image/png': [
    'png',
  ],
  'image/webp': [
    'webp',
  ],
}

const hasMatchingMimeAndExtension = (
  file,
) => {
  const extension =
    getNormalizedExtension(
      file.originalname,
    )

  const allowedExtensions =
    allowedExtensionsByMime[
      file.mimetype
    ]

  return Boolean(
    extension &&
    Array.isArray(
      allowedExtensions,
    ) &&
    allowedExtensions.includes(
      extension,
    ),
  )
}
const busFileFilter = (
  req,
  file,
  callback,
) => {
  const extension =
    getNormalizedExtension(
      file.originalname,
    )

  if (!extension) {
    callback(
      new Error(
        `${file.fieldname}: file extension is required.`,
      ),
    )

    return
  }

  /*
   * Compliance documents
   */
  if (
    busDocumentFields.includes(
      file.fieldname,
    )
  ) {
    if (
      !busDocumentMimeTypes.includes(
        file.mimetype,
      )
    ) {
      callback(
        new Error(
          `${file.fieldname}: only PDF, JPG and PNG files are allowed.`,
        ),
      )

      return
    }

    if (
      !hasMatchingMimeAndExtension(
        file,
      )
    ) {
      callback(
        new Error(
          `${file.fieldname}: file extension does not match its MIME type.`,
        ),
      )

      return
    }

    callback(
      null,
      true,
    )

    return
  }

  /*
   * Bus photos
   */
  if (
    busPhotoFields.includes(
      file.fieldname,
    )
  ) {
    if (
      !busPhotoMimeTypes.includes(
        file.mimetype,
      )
    ) {
      callback(
        new Error(
          `${file.fieldname}: only JPG, PNG and WEBP files are allowed.`,
        ),
      )

      return
    }

    if (
      !hasMatchingMimeAndExtension(
        file,
      )
    ) {
      callback(
        new Error(
          `${file.fieldname}: file extension does not match its MIME type.`,
        ),
      )

      return
    }

    callback(
      null,
      true,
    )

    return
  }

  callback(
    new Error(
      `Unexpected upload field: ${file.fieldname}`,
    ),
  )
}
const busUpload =
  multer({
    storage:
      busStorage,

    limits: {
      fileSize:
        5 *
        1024 *
        1024,

      files: 8,
    },

    fileFilter:
      busFileFilter,
  })

const busDocumentUpload =
  busUpload.fields([
    {
      name:
        'rcDocument',
      maxCount: 1,
    },

    {
      name:
        'insuranceDocument',
      maxCount: 1,
    },

    {
      name:
        'permitDocument',
      maxCount: 1,
    },

    {
      name:
        'fitnessDocument',
      maxCount: 1,
    },

    {
      name:
        'pucDocument',
      maxCount: 1,
    },

    {
      name:
        'frontPhoto',
      maxCount: 1,
    },

    {
      name:
        'sidePhoto',
      maxCount: 1,
    },

    {
      name:
        'interiorPhoto',
      maxCount: 1,
    },
  ])

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  operatorDocumentUpload,
  busDocumentUpload,
}