/* =========================================================
   BUS DRAFT FILE STORAGE
   Uses IndexedDB so File objects survive browser refresh.
   ========================================================= */

export interface BusDraftFiles {
  rcDocument: File | null;

  insuranceDocument: File | null;

  permitDocument: File | null;

  fitnessDocument: File | null;

  pucDocument: File | null;

  frontPhoto: File | null;

  sidePhoto: File | null;

  interiorPhoto: File | null;
}

const DB_NAME =
  'busgo-draft-db';

const DB_VERSION =
  1;

const STORE_NAME =
  'bus-document-files';

const BUS_DRAFT_KEY =
  'current-bus-draft';

/*
 * IndexedDB can be unavailable or quota-limited in private browsing and
 * hardened browser profiles. Keep the active wizard usable in the current
 * tab even when persistence across a refresh is not available.
 */
let memoryDraftFiles:
  BusDraftFiles | null =
  null;

const setPageFileCache = (
  files: BusDraftFiles | null,
) => {
  (
    window as Window & {
      addBusFiles?: BusDraftFiles;
    }
  ).addBusFiles =
    files ?? undefined;
};

const getPageFileCache = () => {
  return (
    window as Window & {
      addBusFiles?: BusDraftFiles;
    }
  ).addBusFiles ?? null;
};

/*
 * =========================================================
 * OPEN DATABASE
 * =========================================================
 */

const openDatabase =
  (): Promise<IDBDatabase> => {
    return new Promise(
      (
        resolve,
        reject,
      ) => {
        const request =
          indexedDB.open(
            DB_NAME,
            DB_VERSION,
          );

        request.onupgradeneeded =
          () => {
            const database =
              request.result;

            if (
              !database
                .objectStoreNames
                .contains(
                  STORE_NAME,
                )
            ) {
              database
                .createObjectStore(
                  STORE_NAME,
                );
            }
          };

        request.onsuccess =
          () => {
            resolve(
              request.result,
            );
          };

        request.onerror =
          () => {
            reject(
              request.error ??
                new Error(
                  'Unable to open IndexedDB.',
                ),
            );
          };
      },
    );
  };

/*
 * =========================================================
 * SAVE ALL FILES
 * =========================================================
 */

export const saveBusDraftFiles =
  async (
    files:
      BusDraftFiles,
  ): Promise<void> => {
    memoryDraftFiles = {
      ...files,
    };

    setPageFileCache(
      memoryDraftFiles,
    );

    let database:
      IDBDatabase;

    try {
      database =
        await openDatabase();
    } catch (error) {
      console.warn(
        '[bus-draft-files] IndexedDB unavailable; using session memory.',
        error,
      );

      return;
    }

    return new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        const transaction =
          database.transaction(
            STORE_NAME,
            'readwrite',
          );

        const store =
          transaction.objectStore(
            STORE_NAME,
          );

        store.put(
          files,
          BUS_DRAFT_KEY,
        );

        transaction.oncomplete =
          () => {
            database.close();

            resolve();
          };

        transaction.onerror =
          () => {
            const error =
              transaction.error;

            database.close();

            console.warn(
              '[bus-draft-files] IndexedDB write failed; using session memory.',
              error,
            );

            resolve();
          };

        transaction.onabort =
          () => {
            const error =
              transaction.error;

            database.close();

            console.warn(
              '[bus-draft-files] IndexedDB transaction aborted; using session memory.',
              error,
            );

            resolve();
          };
      },
    );
  };

/*
 * =========================================================
 * GET SAVED FILES
 * =========================================================
 */

export const getBusDraftFiles =
  async (): Promise<
    BusDraftFiles | null
  > => {
    let database:
      IDBDatabase;

    try {
      database =
        await openDatabase();
    } catch (error) {
      console.warn(
        '[bus-draft-files] Unable to read IndexedDB; using session memory.',
        error,
      );

      return (
        memoryDraftFiles ??
        getPageFileCache()
      );
    }

    return new Promise<
      BusDraftFiles | null
    >(
      (
        resolve,
        reject,
      ) => {
        const transaction =
          database.transaction(
            STORE_NAME,
            'readonly',
          );

        const store =
          transaction.objectStore(
            STORE_NAME,
          );

        const request =
          store.get(
            BUS_DRAFT_KEY,
          );

        request.onsuccess =
          () => {
            const result =
              request.result as
                | BusDraftFiles
                | undefined;

            database.close();

            resolve(
              result ??
                memoryDraftFiles ??
                getPageFileCache(),
            );
          };

        request.onerror =
          () => {
            const error =
              request.error;

            database.close();

            console.warn(
              '[bus-draft-files] IndexedDB read failed; using session memory.',
              error,
            );

            resolve(
              memoryDraftFiles ??
                getPageFileCache(),
            );
          };
      },
    );
  };

/*
 * =========================================================
 * CLEAR FILES AFTER SUCCESS
 * =========================================================
 */

export const clearBusDraftFiles =
  async (): Promise<void> => {
    memoryDraftFiles =
      null;

    setPageFileCache(
      null,
    );

    let database:
      IDBDatabase;

    try {
      database =
        await openDatabase();
    } catch (error) {
      console.warn(
        '[bus-draft-files] Unable to clear IndexedDB; session memory was cleared.',
        error,
      );

      return;
    }

    return new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        const transaction =
          database.transaction(
            STORE_NAME,
            'readwrite',
          );

        const store =
          transaction.objectStore(
            STORE_NAME,
          );

        store.delete(
          BUS_DRAFT_KEY,
        );

        transaction.oncomplete =
          () => {
            database.close();

            resolve();
          };

        transaction.onerror =
          () => {
            const error =
              transaction.error;

            database.close();

            reject(
              error ??
                new Error(
                  'Unable to clear bus files.',
                ),
            );
          };
      },
    );
  };
