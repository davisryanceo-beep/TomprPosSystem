import { onRequest } from "firebase-functions/v2/https";
import serverApp from "./server/index.js";

// Export the Express app as a Cloud Function named 'api'
export const api = onRequest(serverApp);
