export const PASSWORD_MIN_LENGTH = 8;

export type PasswordCheck = {
  valid: boolean;
  score: number;
  label: '弱' | '一般' | '强';
  message: string;
};

export function checkPassword(password: string): PasswordCheck {
  const lengthOk = password.length >= PASSWORD_MIN_LENGTH;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z\d]/.test(password);
  const longEnough = password.length >= 12;
  const score = [lengthOk, hasLetter, hasNumber, hasSymbol, longEnough].filter(Boolean).length;
  const valid = lengthOk && hasLetter && hasNumber;
  const label = score >= 4 ? '强' : score >= 3 ? '一般' : '弱';
  let message = '至少8位，并同时包含字母和数字';
  if (valid && !hasSymbol) message = '可加入符号进一步增强安全性';
  if (valid && hasSymbol) message = '密码强度符合要求';
  return { valid, score, label, message };
}
