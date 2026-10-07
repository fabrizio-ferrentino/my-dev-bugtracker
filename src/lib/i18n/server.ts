import { cookies } from "next/headers";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  dictionaries,
  isLang,
  type Dict,
  type Lang,
} from "./dictionaries";

/** Current language from the `lang` cookie (defaults to Italian). */
export function getLang(): Lang {
  const value = cookies().get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

export function getDict(lang: Lang): Dict {
  return dictionaries[lang];
}

export function getLangAndDict(): { lang: Lang; t: Dict } {
  const lang = getLang();
  return { lang, t: dictionaries[lang] };
}
