import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { getAvailablePort } from "../server/startup";

test("getAvailablePort skips busy ports and returns a free one", async () => {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const port = (server.address() as net.AddressInfo).port;

  const nextPort = await getAvailablePort(port, "127.0.0.1");

  assert.notEqual(nextPort, port);
  await new Promise<void>((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(nextPort, "127.0.0.1", () => {
      probe.close(() => resolve());
    });
  });

  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});
