// i18n Translation Manager
export class I18n {
  constructor(defaultLang = 'ko') {
    this.currentLang = defaultLang;
    this.locales = {
      ko: {},
      en: {}
    };
  }

  async init() {
    try {
      const [koRes, enRes] = await Promise.all([
        fetch('./src/i18n/ko.json').then(r => r.json()),
        fetch('./src/i18n/en.json').then(r => r.json())
      ]);
      this.locales.ko = koRes;
      this.locales.en = enRes;
    } catch (e) {
      console.warn("Failed to load i18n JSON files dynamically, using defaults", e);
    }
  }

  t(path) {
    const keys = path.split('.');
    let cur = this.locales[this.currentLang];
    for (const k of keys) {
      if (cur && cur[k] !== undefined) {
        cur = cur[k];
      } else {
        return path;
      }
    }
    return cur;
  }

  setLang(lang) {
    if (this.locales[lang]) {
      this.currentLang = lang;
    }
  }
}

export const i18n = new I18n('ko');
