const multer =
  require('multer')

const crypto =
  require('crypto')
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
    crypto.randomUUID()

  const extension =
    path
      .extname(
        String(
          file.originalname || '',
        ),
      )
      .toLowerCase()

  return (
    `${file.fieldname}-${uniqueName}${extension}`
  )
}
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
  const extension =
    path
      .extname(
        String(
          file.originalname || '',
        ),
      )
      .replace(
        /^\./,
        '',
      )
      .toLowerCase()

  if (
    !extension
  ) {
    callback(
      new Error(
        `${file.fieldname}: file extension is required.`,
      ),
    )
    return
  }

  if (
    !operatorAllowedMimeTypes.includes(
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

  const operatorAllowedExtensionsByMime = {
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
  }

  if (
    !operatorAllowedExtensionsByMime[
      file.mimetype
    ]?.includes(
      extension,
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

const operatorDocumentUploadBase =
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

const busDocumentUploadBase =
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

const getUploadedBusFiles = (
  req,
) =>
  Object
    .values(
      req.files || {},
    )
    .flat()
    .filter(Boolean)

const removeUploadedFiles = (
  files,
) => {
  for (
    const file of
    files || []
  ) {
    try {
      if (
        file?.path &&
        fs.existsSync(
          file.path,
        )
      ) {
        fs.unlinkSync(
          file.path,
        )
      }
    } catch {
      // Best-effort cleanup only.
    }
  }
}

const hasExpectedFileSignature = (
  file,
) => {
  if (
    !file?.path ||
    !file?.mimetype
  ) {
    return false
  }

  let descriptor

  try {
    descriptor =
      fs.openSync(
        file.path,
        'r',
      )

    const buffer =
      Buffer.alloc(
        16,
      )

    const bytesRead =
      fs.readSync(
        descriptor,
        buffer,
        0,
        buffer.length,
        0,
      )

    if (
      bytesRead <= 0
    ) {
      return false
    }

    if (
      file.mimetype ===
      'application/pdf'
    ) {
      return (
        buffer
          .subarray(
            0,
            5,
          )
          .toString(
            'ascii',
          ) ===
        '%PDF-'
      )
    }

    if (
      file.mimetype ===
      'image/jpeg'
    ) {
      return (
        bytesRead >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      )
    }

    if (
      file.mimetype ===
      'image/png'
    ) {
      const pngSignature =
        Buffer.from([
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a,
        ])

      return (
        bytesRead >=
          pngSignature.length &&
        buffer
          .subarray(
            0,
            pngSignature.length,
          )
          .equals(
            pngSignature,
          )
      )
    }

    if (
      file.mimetype ===
      'image/webp'
    ) {
      return (
        bytesRead >= 12 &&
        buffer
          .subarray(
            0,
            4,
          )
          .toString(
            'ascii',
          ) ===
          'RIFF' &&
        buffer
          .subarray(
            8,
            12,
          )
          .toString(
            'ascii',
          ) ===
          'WEBP'
      )
    }

    return false
  } catch {
    return false
  } finally {
    if (
      descriptor !==
      undefined
    ) {
      try {
        fs.closeSync(
          descriptor,
        )
      } catch {
        // no-op
      }
    }
  }
}

const validateUploadedBusSignatures = (
  req,
  res,
  next,
) => {
  const files =
    getUploadedBusFiles(
      req,
    )

  const invalidFile =
    files.find(
      (
        file,
      ) =>
        !hasExpectedFileSignature(
          file,
        ),
    )

  if (
    !invalidFile
  ) {
    next()
    return
  }

  removeUploadedFiles(
    files,
  )

  const error =
    new Error(
      `${invalidFile.fieldname}: uploaded file content does not match the declared file type.`,
    )

  error.status = 422

  next(
    error,
  )
}

const busDocumentUpload = (
  req,
  res,
  next,
) => {
  busDocumentUploadBase(
    req,
    res,
    (
      error,
    ) => {
      if (
        error
      ) {
        removeUploadedFiles(
          getUploadedBusFiles(
            req,
          ),
        )

        next(
          error,
        )
        return
      }

      validateUploadedBusSignatures(
        req,
        res,
        next,
      )
    },
  )
}
const getUploadedOperatorFiles = (
  req,
) =>
  Object
    .values(
      req.files || {},
    )
    .flat()
    .filter(Boolean)

const validateUploadedOperatorSignatures = (
  req,
  res,
  next,
) => {
  const files =
    getUploadedOperatorFiles(
      req,
    )

  const invalidFile =
    files.find(
      (
        file,
      ) =>
        !hasExpectedFileSignature(
          file,
        ),
    )

  if (
    !invalidFile
  ) {
    next()
    return
  }

  removeUploadedFiles(
    files,
  )

  const error =
    new Error(
      `${invalidFile.fieldname}: uploaded file content does not match the declared file type.`,
    )

  error.status = 422

  next(
    error,
  )
}

const armOperatorUploadFailureCleanup = (
  req,
  res,
) => {
  const files =
    getUploadedOperatorFiles(
      req,
    )

  let cleaned =
    false

  const cleanupOnce = () => {
    if (
      cleaned
    ) {
      return
    }

    cleaned =
      true

    removeUploadedFiles(
      files,
    )
  }

  res.once(
    'finish',
    () => {
      if (
        res.statusCode < 200 ||
        res.statusCode >= 300
      ) {
        cleanupOnce()
      }
    },
  )

  res.once(
    'close',
    () => {
      if (
        !res.writableFinished
      ) {
        cleanupOnce()
      }
    },
  )
}
const operatorDocumentUpload = (
  req,
  res,
  next,
) => {
  operatorDocumentUploadBase(
    req,
    res,
    (
      error,
    ) => {
      if (
        error
      ) {
        removeUploadedFiles(
          getUploadedOperatorFiles(
            req,
          ),
        )

        next(
          error,
        )
        return
      }

      armOperatorUploadFailureCleanup(
        req,
        res,
      )

      validateUploadedOperatorSignatures(
        req,
        res,
        next,
      )
    },
  )
}
module.exports = {
  operatorDocumentUpload,
  busDocumentUpload,
}