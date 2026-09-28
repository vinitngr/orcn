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
  SiGooglecloud 
} from "react-icons/si";
import { FaAws, FaMicrosoft } from "react-icons/fa";
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

export type LogoCategory =
  | "provider"
  | "model"
  | "general"
  | "unknown";

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

const NosanaLogo: IconType = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 100 88" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M28.1063 8.08477C26.61 5.13598 24.1479 2.77203 21.119 1.37608C18.0901 -0.0198731 14.672 -0.365996 11.4187 0.393814C8.16542 1.15362 5.26763 2.97483 3.19508 5.56223C1.12252 8.14963 -0.00333482 11.3516 7.41998e-06 14.649V87.0306H9.80179V14.649C9.81926 13.5385 10.2117 12.4654 10.9171 11.5996C11.6225 10.7338 12.6005 10.1248 13.6964 9.8689C14.7922 9.61302 15.9432 9.72491 16.9673 10.1868C17.9914 10.6488 18.83 11.4344 19.3505 12.4193L52.3746 77.363H41.4087L24.1924 43.5184H13.2265L35.3691 87.0306H68.2666L28.1063 8.08477Z" fill="#10E80C" />
    <path d="M90.1902 0.00628662V72.3878C90.1693 73.4955 89.7754 74.5649 89.0705 75.4275C88.3656 76.2901 87.3898 76.8969 86.2968 77.1523C85.2038 77.4078 84.0557 77.2974 83.0334 76.8384C82.011 76.3795 81.1725 75.5982 80.6499 74.6175L47.6258 9.6738H58.5916L75.808 43.5184H86.7739L64.6397 0.00628662H31.7422L71.8856 78.9521C73.3848 81.8982 75.8479 84.2592 78.8765 85.653C81.9051 87.0469 85.322 87.3921 88.5742 86.6328C91.8264 85.8735 94.7237 84.054 96.7973 81.4689C98.8709 78.8837 99.9995 75.6842 100 72.3878V0.00628662H90.1902Z" fill="#10E80C" />
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
  vllm: SiVllm ,
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
};

const MODEL_LOGOS: Record<string, IconType> = {
  deepseek: RiRobot2Line,
  "deepseek ai": RiRobot2Line,
  qwen: RiRobot2Line,
  baidu: RiRobot2Line,
  llama: RiRobot2Line,
  meta: RiRobot2Line,
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

function getIcon(name: string): IconType {
  return LOGOS[normalize(name)] ?? RiQuestionMark;
}

export function Logo({ name, size = 24, className }: LogoProps) {
  return createElement(getIcon(name), { size, className, "aria-label": name, "aria-hidden": !name });
}

export function getLogoCategory(name: string): LogoCategory {
  const key = normalize(name);

  if (PROVIDER_LOGOS[key]) return "provider";
  if (MODEL_LOGOS[key]) return "model";
  if (GENERAL_LOGOS[key]) return "general";
  return "unknown";
}
