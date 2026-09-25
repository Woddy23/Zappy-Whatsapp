import { parsePhoneNumberFromString, isSupportedCountry, type CountryCode } from 'libphonenumber-js/max';

export interface Template { id: string; label: string; text: string }
export interface Config { version: 1; business: string; appUrl: string; templates: Template[]; image: string }
export const STORAGE_KEY = 'zappyWhatsAppConfig';
export const DEFAULT_LINK_FREE_APP_TEMPLATE: Template = {
  id: 'app_login',
  label: 'Como entrar na app',
  text: 'Olá, {primeiroNome}! 😊\n\nSe já instalou a nossa app, basta abri-la e entrar com o seu número de telemóvel registado connosco. Receberá um código por SMS para validar o acesso.\n\nSe precisar de ajuda, responda a esta mensagem.'
};

export const defaults: Config = {
  version: 1, business: '', appUrl: '', image: '',
  templates: [
    { id: 'contact', label: 'Contactar cliente', text: 'Olá, {primeiroNome}!' },
    { id: 'app', label: 'Enviar link da app', text: 'Olá, {primeiroNome}! 😊\n\nPode aceder à nossa app aqui: {linkApp}\n\n1. Abra o link e siga as instruções de instalação.\n2. Entre com o número de telemóvel registado connosco.\n3. Introduza o código recebido por SMS.\n\nSe precisar de ajuda, responda a esta mensagem.' },
    DEFAULT_LINK_FREE_APP_TEMPLATE
  ]
};

export function migrateConfig(saved: unknown): Config {
  if (!saved || typeof saved !== 'object') return structuredClone(defaults);
  const raw = saved as Partial<Config>;
  const base: Config = {
    version: 1,
    business: typeof raw.business === 'string' ? raw.business : '',
    appUrl: typeof raw.appUrl === 'string' ? raw.appUrl : '',
    image: typeof raw.image === 'string' ? raw.image : '',
    templates: Array.isArray(raw.templates) ? raw.templates.filter(Boolean).map(t => ({ id: String(t.id || ''), label: String(t.label || ''), text: String(t.text || '') })) : []
  };

  if (base.templates.length === 0) {
    base.templates = structuredClone(defaults.templates);
  } else {
    // Preserve every customized template and its text exactly.
    // If the installation link template exists under id 'app', make sure label is clear if it was default
    const hasLinkFree = base.templates.some(t => t.id === 'app_login' || (!t.text.includes('{linkApp}') && t.label.toLowerCase().includes('entrar na app')));
    if (!hasLinkFree && base.templates.length < 8) {
      // Find insertion point right after 'app' template if present, otherwise after first or end
      const appIndex = base.templates.findIndex(t => t.id === 'app');
      const newTemplate = structuredClone(DEFAULT_LINK_FREE_APP_TEMPLATE);
      // Ensure unique id
      let uniqueId = newTemplate.id;
      let counter = 1;
      while (base.templates.some(t => t.id === uniqueId)) {
        uniqueId = `${newTemplate.id}_${counter++}`;
      }
      newTemplate.id = uniqueId;
      if (appIndex >= 0) {
        base.templates.splice(appIndex + 1, 0, newTemplate);
      } else {
        base.templates.push(newTemplate);
      }
    }
  }

  return validateConfig(base);
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
  if (c.version !== 1 || typeof c.business !== 'string' || c.business.length > 100 || typeof c.appUrl !== 'string' || typeof c.image !== 'string' || !Array.isArray(c.templates) || c.templates.length < 1 || c.templates.length > 8) throw new Error('Configuração inválida.');
  const ids = new Set<string>();
  for (const t of c.templates) {
    if (!t || typeof t.id !== 'string' || ids.has(t.id) || typeof t.label !== 'string' || !t.label.trim() || t.label.length > 60 || typeof t.text !== 'string' || !t.text.trim() || t.text.length > 3000) throw new Error('Preencha o título e a mensagem de cada opção (até 3000 caracteres).');
    ids.add(t.id);
    for (const match of t.text.matchAll(/\{([^{}]+)\}/g)) if (!['nome', 'primeiroNome', 'salao', 'linkApp'].includes(match[1])) throw new Error(`Variável desconhecida: ${match[0]}`);
  }
  if (c.image && (!/^data:image\/png;base64,iVBORw0KGgo/.test(c.image) || c.image.length > 2_800_000)) throw new Error('A imagem deve ser PNG, até 2 MB.');
  return { version: 1, business: c.business.trim(), appUrl: validateUrl(c.appUrl), templates: c.templates.map(t => ({ id: t.id, label: t.label.trim(), text: t.text })), image: c.image };
}
export function renderMessage(template: string, name: string, config: Config): string {
  const vars: Record<string, string> = { nome: name, primeiroNome: name.trim().split(/\s+/)[0], salao: config.business, linkApp: config.appUrl };
  return template.replace(/\{([^{}]+)\}/g, (_all, key: string) => {
    if (!(key in vars)) throw new Error(`Variável desconhecida: {${key}}`);
    if (!vars[key]) throw new Error(key === 'linkApp' ? 'Adicione o link de instalação da app nas definições da extensão, ou remova {linkApp} do texto da mensagem.' : `Preencha o campo necessário: ${key}.`);
    return vars[key];
  });
}
export function makeWhatsAppUrl(phone: string, message: string): string {
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) throw new Error('Número inválido.');
  if (!message.trim() || message.length > 4000) throw new Error('A mensagem deve ter entre 1 e 4000 caracteres.');
  return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(message)}`;
}
