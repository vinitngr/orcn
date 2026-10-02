import { createElement } from "react";
import type { IconType } from "react-icons";
import {
  SiCloudflare,
  SiDocker,
  SiGithub,
  SiKubernetes,
  SiLangchain,
  SiPostgresql,
  SiPytorch,
  SiRedis,
  SiSupabase,
  SiTensorflow,
  SiVercel,
  SiGooglecloud,
  SiMeta,
  SiQwen,
  SiDeepseek,
  SiMistralai,
  SiHuggingface,
} from "react-icons/si";
import { FaAws, FaMicrosoft } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

import {
  RiBox3Line,
  RiCloudLine,
  RiCodeBoxLine,
  RiCpuLine,
  RiDatabase2Line,
  RiFlashlightFill,
  RiQuestionMark,
  RiRobot2Line,
  RiServerLine,
  RiSparkling2Fill,
} from "react-icons/ri";

import { SiVllm } from "react-icons/si";
import { BsOpenai } from "react-icons/bs";

export interface LogoProps {
  name: string;
  size?: number;
  className?: string;
}

export type LogoCategory = "provider" | "model" | "general" | "unknown";

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

const NosanaLogo: IconType = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 88"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M28.1063 8.08477C26.61 5.13598 24.1479 2.77203 21.119 1.37608C18.0901 -0.0198731 14.672 -0.365996 11.4187 0.393814C8.16542 1.15362 5.26763 2.97483 3.19508 5.56223C1.12252 8.14963 -0.00333482 11.3516 7.41998e-06 14.649V87.0306H9.80179V14.649C9.81926 13.5385 10.2117 12.4654 10.9171 11.5996C11.6225 10.7338 12.6005 10.1248 13.6964 9.8689C14.7922 9.61302 15.9432 9.72491 16.9673 10.1868C17.9914 10.6488 18.83 11.4344 19.3505 12.4193L52.3746 77.363H41.4087L24.1924 43.5184H13.2265L35.3691 87.0306H68.2666L28.1063 8.08477Z"
      fill="#10E80C"
    />
    <path
      d="M90.1902 0.00628662V72.3878C90.1693 73.4955 89.7754 74.5649 89.0705 75.4275C88.3656 76.2901 87.3898 76.8969 86.2968 77.1523C85.2038 77.4078 84.0557 77.2974 83.0334 76.8384C82.011 76.3795 81.1725 75.5982 80.6499 74.6175L47.6258 9.6738H58.5916L75.808 43.5184H86.7739L64.6397 0.00628662H31.7422L71.8856 78.9521C73.3848 81.8982 75.8479 84.2592 78.8765 85.653C81.9051 87.0469 85.322 87.3921 88.5742 86.6328C91.8264 85.8735 94.7237 84.054 96.7973 81.4689C98.8709 78.8837 99.9995 75.6842 100 72.3878V0.00628662H90.1902Z"
      fill="#10E80C"
    />
  </svg>
);

const PROVIDER_LOGOS: Record<string, IconType> = {
  openai: BsOpenai,
  aws: FaAws,
  amazon: FaAws,
  "amazon web services": FaAws,
  gcp: SiGooglecloud,
  nosana: NosanaLogo,
  akash: RiCloudLine,
  "akash network": RiCloudLine,
  azure: FaMicrosoft,
  "microsoft azure": FaMicrosoft,
  vllm: SiVllm,
  openrouter: RiSparkling2Fill,
  runpod: RiServerLine,
  together: RiSparkling2Fill,
  "together ai": RiSparkling2Fill,
  fireworks: RiSparkling2Fill,
  "fireworks ai": RiSparkling2Fill,
  modal: RiCloudLine,
  baseten: RiServerLine,
  anyscale: RiServerLine,
  lambda: RiServerLine,
  "lambda labs": RiServerLine,
  coreweave: RiCloudLine,
  lepton: RiServerLine,
  cloudflare: SiCloudflare,
  vercel: SiVercel,
  docker: SiDocker,
  kubernetes: SiKubernetes,
  k8s: SiKubernetes,
  github: SiGithub,
  supabase: SiSupabase,
  postgres: SiPostgresql,
  postgresql: SiPostgresql,
  redis: SiRedis,
  pytorch: SiPytorch,
  tensorflow: SiTensorflow,
  langchain: SiLangchain,
  server: RiServerLine,
  servers: RiServerLine,
  compute: RiCpuLine,
  cpu: RiCpuLine,
  gpu: RiCpuLine,
  cloud: RiCloudLine,
  database: RiDatabase2Line,
  db: RiDatabase2Line,
  container: RiBox3Line,
  runtime: RiFlashlightFill,
  google: FcGoogle,
};

const SarvamLogo: IconType = ({ size = 24, className }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src="/sarvam.svg"
    width={size}
    height={size}
    alt="Sarvam"
    className={["invert dark:invert-0", className]
      .filter(Boolean)
      .join(" ")}
    style={{ width: size, height: size, objectFit: "contain" }}
  />
);

const MicrosoftLogo: IconType = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="2" y="2" width="9" height="9" fill="#F25022" />
    <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
    <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
    <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
  </svg>
);

const MODEL_LOGOS: Record<string, IconType> = {
  deepseek: SiDeepseek,
  "deepseek ai": SiDeepseek,
  qwen: SiQwen,
  alibaba: SiQwen,
  mistral: SiMistralai,
  mistralai: SiMistralai,
  meta: SiMeta,
  "meta llama": SiMeta,
  llama: SiMeta,
  microsoft: MicrosoftLogo,
  sarvam: SarvamLogo,
  sarvamai: SarvamLogo,
  huggingface: SiHuggingface,
  hf: SiHuggingface,
  baidu: RiRobot2Line,
};

const GENERAL_LOGOS: Record<string, IconType> = {
  ai: RiSparkling2Fill,
  model: RiRobot2Line,
  robot: RiRobot2Line,
  agent: RiRobot2Line,
  agents: RiRobot2Line,
  code: RiCodeBoxLine,
  coding: RiCodeBoxLine,
};

const LOGOS: Record<string, IconType> = {
  ...PROVIDER_LOGOS,
  ...MODEL_LOGOS,
  ...GENERAL_LOGOS,
};

const FallbackLogo: IconType = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeOpacity="0.4"
    />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" fillOpacity="0.7" />
    <circle cx="15" cy="9" r="1.5" fill="currentColor" fillOpacity="0.7" />
    <path
      d="M8 15C8 15 9.5 17 12 17C14.5 17 16 15 16 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeOpacity="0.7"
    />
  </svg>
);

const LocalNodeLogo: IconType = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x="2"
      y="4"
      width="20"
      height="7"
      rx="1.5"
      stroke="#38bdf8"
      strokeWidth="1.7"
    />
    <rect
      x="2"
      y="13"
      width="20"
      height="7"
      rx="1.5"
      stroke="#38bdf8"
      strokeWidth="1.7"
    />
    <circle cx="6" cy="7.5" r="1" fill="#38bdf8" />
    <circle cx="9" cy="7.5" r="1" fill="#38bdf8" />
    <circle cx="6" cy="16.5" r="1" fill="#38bdf8" />
    <circle cx="9" cy="16.5" r="1" fill="#38bdf8" />
  </svg>
);

/** Know logo keys, longest first so "meta llama" wins over "meta". */
const SORTED_LOGO_KEYS = Object.keys(LOGOS).sort((a, b) => b.length - a.length);

/**
 * Find a known logo key inside a longer identifier such as
 * "Qwen/Qwen3-14B-AWQ" or "meta-llama/Llama-3.1-8B-Instruct".
 */
function findLogoKey(name: string): string | null {
  const n = normalize(name);
  if (LOGOS[n]) return n;
  for (const key of SORTED_LOGO_KEYS) {
    if (
      n.startsWith(`${key} `) ||
      n.startsWith(`${key}/`) ||
      n.includes(`/${key}`) ||
      n.includes(` ${key} `) ||
      n.endsWith(` ${key}`)
    ) {
      return key;
    }
  }
  return null;
}

function getIcon(name: string): IconType {
  const n = normalize(name);
  if (n === "local" || n === "local node" || n === "localhost") {
    return LocalNodeLogo;
  }
  const key = LOGOS[n] ? n : findLogoKey(name);
  return (key && LOGOS[key]) || FallbackLogo;
}

export function Logo({ name, size = 24, className }: LogoProps) {
  return createElement(getIcon(name), {
    size,
    className,
    "aria-label": name,
    "aria-hidden": !name,
  });
}

export function getLogoCategory(name: string): LogoCategory {
  const key = normalize(name);

  if (PROVIDER_LOGOS[key]) return "provider";
  if (MODEL_LOGOS[key]) return "model";
  if (GENERAL_LOGOS[key]) return "general";
  const fuzzy = findLogoKey(name);
  if (fuzzy) {
    if (PROVIDER_LOGOS[fuzzy]) return "provider";
    if (MODEL_LOGOS[fuzzy]) return "model";
    if (GENERAL_LOGOS[fuzzy]) return "general";
  }
  return "unknown";
}
