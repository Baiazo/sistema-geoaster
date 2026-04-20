/** Remove tudo que não for dígito */
function digits(v: string) {
  return v.replace(/\D/g, "");
}

/** CPF: 000.000.000-00 */
export function maskCpf(value: string): string {
  const d = digits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CNPJ: 00.000.000/0000-00 */
export function maskCnpj(value: string): string {
  const d = digits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * CPF ou CNPJ — detecta automaticamente pelo número de dígitos digitados.
 * Até 11 dígitos → CPF, a partir de 12 → CNPJ.
 */
export function maskCpfCnpj(value: string): string {
  const d = digits(value).slice(0, 14);
  return d.length <= 11 ? maskCpf(d) : maskCnpj(d);
}

/**
 * Telefone: (00) 0000-0000 (fixo) ou (00) 00000-0000 (celular).
 * Auto-detecta pelo 9º dígito.
 */
export function maskTelefone(value: string): string {
  const d = digits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
