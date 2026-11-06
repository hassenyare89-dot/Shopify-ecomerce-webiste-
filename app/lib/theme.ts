import {siteConfig} from '~/config/site';

type Palette = Record<keyof (typeof siteConfig.theme)['light'], string>;

const TOKEN_MAP: Record<keyof Palette, string> = {
  primary: '--brand-primary',
  primaryForeground: '--brand-primary-foreground',
  secondary: '--brand-secondary',
  secondaryForeground: '--brand-secondary-foreground',
  accent: '--brand-accent',
  accentForeground: '--brand-accent-foreground',
  background: '--brand-background',
  foreground: '--brand-foreground',
  muted: '--brand-muted',
  border: '--brand-border',
  surface: '--brand-surface',
  sale: '--brand-sale',
  success: '--brand-success',
};

/** Only allow safe CSS color/font values from config (defence against CSS injection). */
const SAFE_CSS_VALUE = /^[#(),.%\-\s\w"']+$/;

function declarations(palette: Palette): string {
  return (Object.keys(TOKEN_MAP) as (keyof Palette)[])
    .filter((k) => SAFE_CSS_VALUE.test(palette[k]))
    .map((k) => `${TOKEN_MAP[k]}:${palette[k]};`)
    .join('');
}

/**
 * Generates the CSS custom properties for the brand theme. Light is the
 * default; dark applies when `data-theme="dark"` or (in system mode) when the
 * OS prefers dark and the shopper hasn't chosen light.
 */
export function buildThemeCss(theme = siteConfig.theme): string {
  const {fonts, radius} = theme;
  const base = [
    SAFE_CSS_VALUE.test(fonts.heading) ? `--brand-font-heading:${fonts.heading};` : '',
    SAFE_CSS_VALUE.test(fonts.body) ? `--brand-font-body:${fonts.body};` : '',
    SAFE_CSS_VALUE.test(radius) ? `--brand-radius:${radius};` : '',
    SAFE_CSS_VALUE.test(theme.heroBackground) ? `--brand-hero:${theme.heroBackground};` : '',
  ].join('');
  const light = declarations(theme.light);
  const dark = declarations(theme.dark);

  let css = `:root{${base}${light}}`;
  if (theme.enableDarkMode) {
    css += `:root[data-theme="dark"]{${dark}}`;
  }
  return css;
}

/**
 * Tiny blocking script that applies the saved/system theme before first
 * paint to avoid a flash. Rendered with the CSP nonce.
 */
export function themeInitScript(theme = siteConfig.theme): string {
  if (!theme.enableDarkMode) {
    return `document.documentElement.dataset.theme='light';`;
  }
  // Only known literals are ever embedded in the inline script.
  const fallback =
    theme.defaultMode === 'light' ? "'light'" : theme.defaultMode === 'dark' ? "'dark'" : "'system'";
  return `(function(){try{var d=document.documentElement,s=localStorage.getItem('theme'),m=s==='light'||s==='dark'?s:${fallback};if(m==='system'){m=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=m}catch(e){}})();`;
}
