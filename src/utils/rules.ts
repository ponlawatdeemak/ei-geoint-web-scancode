export function passwordRules(password: string) {
  return [
    /^[A-Za-z\d!@#$%*&]{8,99}$/.test(password),
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%*&]+/.test(password),
  ]
}
