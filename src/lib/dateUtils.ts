/**
 * Obtém a data atual no fuso horário local
 * @returns string no formato YYYY-MM-DD
 */
export const getCurrentDateBrazil = (): string => {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Formata uma data para o formato YYYY-MM-DD
 * @param date - Data a ser formatada
 * @returns string no formato YYYY-MM-DD
 */
export const formatDateBrazil = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};