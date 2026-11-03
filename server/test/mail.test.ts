import net from "node:net";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();
const pdf = Buffer.from("%PDF-1.4 sample").toString("base64");
const good = {
  to: "supplier@example.com",
  subject: "Local Purchase Order LPO-1",
  text: "Please find it attached.",
  filename: "Local_Purchase_Order_LPO-1.pdf",
  pdf
};
let received = "";
let recipients: string[] = [];
// Just enough of a mail server to take one message.
const smtp = net.createServer(s => {
  let inData = false;
  s.write("220 test\r\n");
  s.on("data", d => {
    const t = d.toString("latin1");
    if (inData) {
      received += t;
      if (t.endsWith("\r\n.\r\n")) {
        inData = false;
        s.write("250 ok\r\n");
      }
      return;
    }
    if (/^RCPT/i.test(t)) recipients.push(t);
    if (/^DATA/i.test(t)) {
      inData = true;
      s.write("354 go\r\n");
    } else if (/^QUIT/i.test(t)) s.end("221 bye\r\n");
    else s.write("250 ok\r\n");
  });
});

beforeAll(() => new Promise<void>(r => smtp.listen(2526, "127.0.0.1", () => r())));
afterAll(() => new Promise<void>(r => smtp.close(() => r())));
afterEach(() => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_FROM;
  delete process.env.PRINT_KEY;
  received = "";
  recipients = [];
});
const setUp = () => {
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = "2526";
  process.env.SMTP_FROM = "Hotel <stores@example.com>";
};

describe("emailing a document", () => {
  it("says so when no mail account is set", async () => {
    delete process.env.SMTP_HOST;
    const r = await request(app).post("/api/mail/send").send(good);
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe("MAIL_NOT_SET");
  });
  it("sends the PDF to the one address asked for", async () => {
    setUp();
    const r = await request(app).post("/api/mail/send").send(good);
    expect(r.status).toBe(200);
    expect(recipients.join()).toContain("supplier@example.com");
    expect(received).toContain("Local_Purchase_Order_LPO-1.pdf");
    expect(received).toContain("application/pdf");
  });
  it("refuses a terminal without the print key", async () => {
    setUp();
    process.env.PRINT_KEY = "secret";
    const no = await request(app).post("/api/mail/send").send(good);
    expect(no.status).toBe(403);
    const yes = await request(app).post("/api/mail/send").set("x-print-key", "secret").send(good);
    expect(yes.status).toBe(200);
  });
  it("only sends a real PDF, to one valid address", async () => {
    setUp();
    const send = (b: object) =>
      request(app)
        .post("/api/mail/send")
        .send({ ...good, ...b });
    expect((await send({ pdf: Buffer.from("<html>").toString("base64") })).status).toBe(400);
    expect((await send({ to: "a@b.com, c@d.com" })).status).toBe(400);
    expect((await send({ filename: "../evil.exe" })).status).toBe(400);
    expect(recipients).toHaveLength(0);
  });
  it("reports a mail server that doesn't answer", async () => {
    setUp();
    process.env.SMTP_PORT = "2599";
    const r = await request(app).post("/api/mail/send").send(good);
    expect(r.status).toBe(502);
    expect(r.body.error.code).toBe("MAIL_FAILED");
  });
});
