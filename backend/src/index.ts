import "dotenv/config";
import { createApp } from "./app";
import { infoLog } from "./lib/log";

const app = createApp();
const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  infoLog(`Gary backend running on port ${PORT}`);
});
