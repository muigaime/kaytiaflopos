import net from "node:net";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { isPrinterAddress, ticketBytes } from "../src/modules/printing/print.routes.js";

const app = createApp();
const lines = [{ t: "KITCHEN ORDER", big: true, center: true }, { t: "2 x Fish" }];
const received: Buffer[] = [];
const printer = net.createServer(s => {
  const parts: Buffer[] = [];
  s.on("data", d => parts.push(Buffer.from(d)));
  s.on("end", () => received.push(Buffer.concat(parts)));
});

beforeAll(() => new Promise<void>(r => printer.listen(9107, "127.0.0.1", () => r())));
afterAll(() => new Promise<void>(r => printer.close(() => r())));

describe("printing tickets", () => {
  it("sends the ticket to the chosen printer", async () => {
    const res = await request(app)
      .post("/api/print/ticket")
      .send({ printer: { ip: "127.0.0.1", port: 9107 }, lines });
    expect(res.status).toBe(200);
    expect(received.at(-1)!.toString("latin1")).toContain("2 x Fish");
  });
  it("reports a printer that does not answer", async () => {
    const res = await request(app)
      .post("/api/print/ticket")
      .send({ printer: { ip: "127.0.0.1", port: 9108 }, lines });
    expect(res.status).toBe(502);
  });
  it("only reaches the local network and printer ports", async () => {
    expect(isPrinterAddress("192.168.1.50")).toBe(true);
    expect(isPrinterAddress("172.32.0.1")).toBe(false);
    const outside = await request(app)
      .post("/api/print/ticket")
      .send({ printer: { ip: "8.8.8.8", port: 9100 }, lines });
    expect(outside.status).toBe(400);
    const port = await request(app)
      .post("/api/print/ticket")
      .send({ printer: { ip: "127.0.0.1", port: 5432 }, lines });
    expect(port.status).toBe(400);
  });
  it("refuses other websites without the key", async () => {
    const res = await request(app)
      .post("/api/print/ticket")
      .set("Origin", "https://example.com")
      .send({ printer: { ip: "127.0.0.1", port: 9107 }, lines });
    expect(res.status).toBe(403);
  });
  it("cannot smuggle printer commands in ticket text", () => {
    const b = ticketBytes([{ t: "a\u001b@b\u001dV" }]);
    expect(b.toString("latin1")).toContain("a @b V");
  });
});
