export type Setor = "GEO" | "AMBIENTAL" | "IMOVEIS";

export const SETOR_CONFIG: Record<Setor, {
  label: string;
  labelCurto: string;
  descricao: string;
  activeBg: string;
  activeText: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  cardBg: string;
  iconColor: string;
  logo: string;
  logoBranco: string;
  logoSidebarFilter?: string;
}> = {
  GEO: {
    label: "GeoAster Geo",
    labelCurto: "Geo",
    descricao: "Georreferenciamento e regularização fundiária",
    activeBg: "bg-sky-500",
    activeText: "text-white",
    badgeBg: "bg-sky-800",
    badgeText: "text-sky-200",
    cardBorder: "border-sky-400",
    cardBg: "bg-sky-50 dark:bg-sky-950",
    iconColor: "text-sky-500",
    logo: "/logo-geo.png",
    logoBranco: "/logo-geo-branco.png",
  },
  AMBIENTAL: {
    label: "GeoAster Ambiental",
    labelCurto: "Ambiental",
    descricao: "Licenciamento e regularização ambiental",
    activeBg: "bg-emerald-500",
    activeText: "text-white",
    badgeBg: "bg-emerald-800",
    badgeText: "text-emerald-200",
    cardBorder: "border-emerald-400",
    cardBg: "bg-emerald-50 dark:bg-emerald-950",
    iconColor: "text-emerald-500",
    logo: "/logo-ambiental.png",
    logoBranco: "/logo-ambiental-branco.png",
  },
  IMOVEIS: {
    label: "Baster Imóveis",
    labelCurto: "Imóveis",
    descricao: "Gestão e intermediação imobiliária",
    activeBg: "bg-yellow-400",
    activeText: "text-gray-900",
    badgeBg: "bg-yellow-700",
    badgeText: "text-yellow-100",
    cardBorder: "border-yellow-400",
    cardBg: "bg-yellow-50 dark:bg-yellow-950",
    iconColor: "text-yellow-500",
    logo: "/logo-imoveis.png",
    logoBranco: "/logo-imoveis.png",
    logoSidebarFilter: "brightness(0) invert(1)",
  },
};

export const TODOS_SETORES: Setor[] = ["GEO", "AMBIENTAL", "IMOVEIS"];

export function getSetoresEfetivos(setores: Setor[]): Setor[] {
  if (setores.length === 0) return TODOS_SETORES;
  return setores;
}
