import { assertSafeConfig, config } from "./config.js";
import { createApp } from "./app.js";

assertSafeConfig();
createApp().listen(config.port, () => {
  console.log(`Kaytia master server on http://localhost:${config.port}`);
});
