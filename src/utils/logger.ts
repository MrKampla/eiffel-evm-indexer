export const logger = {
  log: (...data: any) => {
    console.log(`[${new Date().toISOString()}] LOG: ${data}`);
  },
  error: (...data: any) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${data}`);
  },
};
