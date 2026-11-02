import net from "node:net";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  installedPrinters,
  isPrinterAddress,
  isTicketPrinter,
  sendInstalled,
  ticketBytes
} from "../src/modules/printing/print.routes.js";

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

describe("printers installed on this computer", () => {
  it("leaves out printers that can't print a ticket", () => {
    expect(isTicketPrinter("USB002")).toBe(true);
    expect(isTicketPrinter("LPT1:")).toBe(true);
    expect(isTicketPrinter("192.168.1.50")).toBe(true);
    expect(isTicketPrinter("PORTPROMPT:")).toBe(false);
    expect(isTicketPrinter("nul:")).toBe(false);
    expect(isTicketPrinter("SHRFAX:")).toBe(false);
    expect(isTicketPrinter("Microsoft.Office.OneNote_16001")).toBe(false);
  });

  it("lists them", async () => {
    const res = await request(app).get("/api/print/installed");
    expect(res.status).toBe(200);
    expect(res.body.printers).toEqual(await installedPrinters());
  }, 30000);

  it("refuses a name that isn't installed, without touching a printer", async () => {
    const res = await request(app)
      .post("/api/print/ticket")
      .send({ printer: { name: "Kaytia no such printer" }, lines });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_PRINTER");
  }, 30000);

  it.runIf(process.platform === "win32")(
    "gets as far as Windows refusing an unknown printer",
    async () => {
      await expect(sendInstalled("Kaytia no such printer", Buffer.from("x"))).rejects.toThrow(
        /open/
      );
    },
    30000
  );

  it("refuses a page from another site", async () => {
    const res = await request(app)
      .get("/api/print/installed")
      .set("origin", "https://example.com");
    expect(res.status).toBe(403);
  });
});

describe("a logo on a ticket", () => {
  const img = { w: 2, h: 2, data: Buffer.from([0xff, 0x00, 0x0f, 0xf0]).toString("base64") };

  it("goes out as a printer picture", () => {
    const b = ticketBytes([{ t: "", img }]);
    const at = b.indexOf(Buffer.from([0x1d, 0x76, 0x30, 0, 2, 0, 2, 0]));
    expect(at).toBeGreaterThan(-1);
    expect([...b.subarray(at + 8, at + 12)]).toEqual([0xff, 0x00, 0x0f, 0xf0]);
  });

  it("is refused when its size doesn't match its data", async () => {
    const res = await request(app)
      .post("/api/print/ticket")
      .send({ printer: { ip: "127.0.0.1", port: 9107 }, lines: [{ t: "", img: { ...img, h: 9 } }] });
    expect(res.status).toBe(400);
  });
});

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
