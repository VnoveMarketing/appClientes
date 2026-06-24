export function stripCpf(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCpfInput(value: string) {
  const digits = stripCpf(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isCpfComplete(value: string) {
  return stripCpf(value).length === 11;
}

export function isCpfValid(value: string) {
  const digits = stripCpf(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => {
      return total + Number(base[index]) * weight;
    }, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (firstDigit !== Number(digits[9])) return false;

  const secondDigit = calcDigit(digits, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return secondDigit === Number(digits[10]);
}
