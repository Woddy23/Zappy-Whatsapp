import { parsePhoneNumberFromString, isSupportedCountry, type CountryCode } from 'libphonenumber-js/max';

export interface Template { id: string; label: string; text: string; image?: string }
export interface Config { version: 2; business: string; appUrl: string; templates: Template[]; images: Record<string, string> }
export const MAX_CONFIG_BYTES = 9 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const STORAGE_KEY = 'zappyWhatsAppConfig';
export const DEFAULT_LINK_FREE_APP_TEMPLATE: Template = {
  id: 'app_login',
  label: 'Como entrar na app',
  text: 'Olá, {primeiroNome}!\n\nSe já instalou a nossa app, basta abri-la e entrar com o seu número de telemóvel registado connosco. Receberá um código por SMS para validar o acesso.\n\nSe precisar de ajuda, responda a esta mensagem.'
};

export const defaults: Config = {
  version: 2, business: '', appUrl: '', images: {},
  templates: [
    { id: 'contact', label: 'Contactar cliente', text: 'Olá, {primeiroNome}!' },
    { id: 'app', label: 'Enviar link da app', text: 'Olá, {primeiroNome}!\n\nPode aceder à nossa app aqui: {linkApp}\n\n1. Abra o link e siga as instruções de instalação.\n2. Entre com o número de telemóvel registado connosco.\n3. Introduza o código recebido por SMS.\n\nSe precisar de ajuda, responda a esta mensagem.' },
    DEFAULT_LINK_FREE_APP_TEMPLATE
  ]
};

export function migrateConfig(saved: unknown): Config {
  if (saved === undefined) return structuredClone(defaults);
  if (!saved || typeof saved !== 'object') throw new Error('Configuração inválida.');
  const raw = saved as Omit<Config, 'version'> & { version: number; image?: string };
  if (raw.version === 2) return validateConfig(raw);
  if (raw.version !== 1) throw new Error('Versão de configuração não suportada.');
  const image = validateImage(raw.image);
  if (!Array.isArray(raw.templates)) throw new Error('Configuração inválida.');
  return validateConfig({ ...raw, version: 2, images: image ? { legacy: image } : {}, templates: raw.templates.map(t => {
    if (!t || typeof t.id !== 'string' || typeof t.label !== 'string') throw new Error('Configuração inválida.');
    return { id: t.id, label: t.label, text: t.text, ...(image && (t.id.startsWith('app') || /app/i.test(t.label)) ? { image: 'legacy' } : {}) };
  }) });
}
export function validateImage(value: unknown): string {
  if (typeof value !== 'string') throw new Error('A imagem deve ser PNG, até 2 MB.');
  if (!value) return '';
  const prefix = 'data:image/png;base64,';
  const encoded = value.slice(prefix.length);
  if (!value.startsWith(prefix) || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error('A imagem deve ser PNG, até 2 MB.');
  const bytes = atob(encoded);
  if (bytes.length > MAX_IMAGE_BYTES || !bytes.startsWith('\x89PNG\r\n\x1a\n')) throw new Error('A imagem deve ser PNG, até 2 MB.');
  return value;
}
export function normalisePhone(raw: string, country?: string): string {
  const cleaned = raw.trim();
  if (!cleaned || !/^\+?[\d\s().-]+$/.test(cleaned)) throw new Error('Verifique o número de telemóvel na ficha.');
  const number = cleaned.replace(/^00/, '+');
  const region = country?.toUpperCase();
  if (!number.startsWith('+') && (!region || !isSupportedCountry(region))) {
    throw new Error('Use um número com indicativo internacional, por exemplo +351.');
  }
  const phone = parsePhoneNumberFromString(number, { defaultCountry: region as CountryCode | undefined, extract: false });
  if (!phone?.isValid() || phone.ext) throw new Error('O número de telemóvel não é válido. Corrija-o na ficha.');
  return phone.number;
}
export function validateUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Introduza um link completo, começado por https://.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('O link deve usar HTTPS e não incluir credenciais.');
  if (value.length > 2000) throw new Error('O link é demasiado longo.');
  return url.href;
}
export function validateConfig(value: unknown): Config {
  if (!value || typeof value !== 'object') throw new Error('Configuração inválida. Abra as definições e guarde novamente.');
  const c = value as Config;
  if (c.version !== 2 || typeof c.business !== 'string' || c.business.length > 100 || typeof c.appUrl !== 'string' || !c.images || typeof c.images !== 'object' || Array.isArray(c.images) || !Array.isArray(c.templates) || c.templates.length < 1 || c.templates.length > 8) throw new Error('Configuração inválida.');
  const ids = new Set<string>();
  const images: Record<string, string> = Object.create(null);
  for (const t of c.templates) {
    if (!t || typeof t.id !== 'string' || !t.id || t.id.length > 100 || ids.has(t.id) || typeof t.label !== 'string' || !t.label.trim() || t.label.length > 60 || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 3000) throw new Error('Preencha o título e a mensagem de cada opção (até 3000 caracteres).');
    ids.add(t.id);
    if (t.image !== undefined) {
      if (typeof t.image !== 'string' || !Object.hasOwn(c.images, t.image) || !c.images[t.image]) throw new Error('A imagem de uma mensagem não foi encontrada. Escolha novamente a imagem.');
      if (!Object.hasOwn(images, t.image)) images[t.image] = validateImage(c.images[t.image]);
    }
    for (const match of t.text.matchAll(/\{([^{}]+)\}/g)) if (!['nome', 'primeiroNome', 'salao', 'linkApp'].includes(match[1])) throw new Error(`Variável desconhecida: ${match[0]}`);
  }
  const result: Config = { version: 2, business: c.business.trim(), appUrl: validateUrl(c.appUrl), templates: c.templates.map(t => {
    // Repair only an otherwise unchanged stock message. Never guess lost characters in custom text.
    const clean = t.text.replace(/^Olá, \{primeiroNome\}! (?:\u{1f60a}|\ufffd{1,2}|[\ud800-\udfff])(?=\r?\n\r?\n)/u, 'Olá, {primeiroNome}!');
    const stock = defaults.templates.find(stock => stock.id === t.id);
    return { id: t.id, label: t.label, text: clean === stock?.text ? clean : t.text, ...(t.image ? { image: t.image } : {}) };
  }), images: { ...images } };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > MAX_CONFIG_BYTES) throw new Error('As definições ultrapassam 9 MB. Remova ou reduza imagens.');
  return result;
}
export function validateMessageText(text: string): void {
  if (/[\ufffd\ud800-\udfff]/u.test(text)) throw new Error('A mensagem contém um caráter inválido (�). Apague-o e escreva-o novamente.');
}
export function renderMessage(template: string, name: string, config: Config): string {
  const vars: Record<string, string> = { nome: name, primeiroNome: name.trim().split(/\s+/)[0], salao: config.business, linkApp: config.appUrl };
  const message = template.replace(/\{([^{}]+)\}/g, (_all, key: string) => {
    if (!(key in vars)) throw new Error(`Variável desconhecida: {${key}}`);
    if (!vars[key]) throw new Error(key === 'linkApp' ? 'Adicione o link de instalação da app nas definições da extensão, ou remova {linkApp} do texto da mensagem.' : `Preencha o campo necessário: ${key}.`);
    return vars[key];
  });
  validateMessageText(message);
  return message;
}
export function makeWhatsAppUrl(phone: string, message: string): string {
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) throw new Error('Número inválido.');
  validateMessageText(message);
  if (!message.trim() || message.length > 4000) throw new Error('A mensagem deve ter entre 1 e 4000 caracteres.');
  return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}`;
}
