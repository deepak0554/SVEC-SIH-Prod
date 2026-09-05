import net from "node:net";

export async function getAvailablePort(preferredPort: number, host = "0.0.0.0"): Promise<number> {
  const candidateStart = Number.isFinite(preferredPort) && preferredPort > 0 ? preferredPort : 3000;

  for (let port = candidateStart; port < candidateStart + 50; port += 1) {
    const isAvailable = await new Promise<boolean>((resolve) => {
      const tester = net.createServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, host);
    });

    if (isAvailable) {
      return port;
    }
  }

  return candidateStart;
}
