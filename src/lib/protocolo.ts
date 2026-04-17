import { randomInt } from "crypto";

export function gerarProtocolo(): string {
  const ano = new Date().getFullYear();
  const random = randomInt(100000, 1000000);
  return `GEO-${ano}-${random}`;
}
