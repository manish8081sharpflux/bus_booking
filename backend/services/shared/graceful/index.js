function setupGraceful({ servers = [], closeables = [], timeout = 30000, logger = console } = {}) {
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info && logger.info('shutdown', { signal });
    const tasks = [];
    servers.forEach((s) => {
      try {
        tasks.push(new Promise((res) => s.close(() => res())));
      } catch (e) {
        // ignore
      }
    });
    closeables.forEach((c) => {
      try {
        if (typeof c === 'function') tasks.push(c());
        else if (c && typeof c.close === 'function') tasks.push(c.close());
      } catch (e) {}
    });
    await Promise.race([Promise.allSettled(tasks), new Promise((r) => setTimeout(r, timeout))]);
    process.exit(0);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return shutdown;
}

module.exports = { setupGraceful };
