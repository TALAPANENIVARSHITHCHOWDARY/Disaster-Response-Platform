const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };
  
  return JSON.stringify(logEntry);
}

export const logger = {
  error: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(formatLogMessage('error', message, meta));
    }
  },
  
  warn: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(formatLogMessage('warn', message, meta));
    }
  },
  
  info: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.info(formatLogMessage('info', message, meta));
    }
  },
  
  debug: (message, meta = {}) => {
    if (currentLogLevel >= LOG_LEVELS.debug) {
      console.debug(formatLogMessage('debug', message, meta));
    }
  }
};