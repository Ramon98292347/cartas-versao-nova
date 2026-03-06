export type ViaCepResult = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
};

export function onlyDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function fetchAddressByCep(rawCep: string): Promise<ViaCepResult> {
  const cep = onlyDigits(rawCep);
  if (cep.length !== 8) {
    throw new Error("invalid_cep");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const data = await response.json();

  if (!response.ok || data?.erro) {
    throw new Error("cep_not_found");
  }

  return {
    cep: String(data.cep || ""),
    logradouro: String(data.logradouro || ""),
    complemento: String(data.complemento || ""),
    bairro: String(data.bairro || ""),
    localidade: String(data.localidade || ""),
    uf: String(data.uf || ""),
  };
}
