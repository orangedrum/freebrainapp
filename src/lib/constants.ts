import {
  Activity,
  Brain,
  BrainCircuit,
  Dna,
  HeartPulse,
  Microscope,
  ShieldAlert,
  Baby,
  Accessibility,
  Footprints,
  Zap,
  Waves,
  Instagram,
  Facebook,
} from "lucide-react";
import type { Condition, EvidenceItem, NeuralNode, SocialFeed } from "@/types";
import { TikTokIcon } from "@/components/shared/TikTokIcon";

export const LOGO_URL =
  "https://assets.cdn.filesafe.space/yblU9x5q5wszWmmHd5ey/media/6a3b53b3ae7d4768392fa598.png";

export const FIREFLY_LOGO_URL =
  "https://vibe.filesafe.space/1782179753705442134/attachments/3bb178ac-ff68-42c2-a782-b105f1b839bb.gif";

export const NEURAL_BACKGROUND_URL =
  "https://vibe.filesafe.space/1782179753705442134/assets/8a3f72d6-636c-40a8-94d5-9470a16637b8.png";

export const VIDEO_SOURCES = {
  onDemand: {
    src: "https://assets.cdn.filesafe.space/yblU9x5q5wszWmmHd5ey/media/691d2e626d309e0556272b9f.mp4",
    poster:
      "https://assets.cdn.filesafe.space/yblU9x5q5wszWmmHd5ey/media/6a3c3f6a817563b473deb335.png",
  },
  becomeFreeBrainer: {
    src: "https://assets.cdn.filesafe.space/yblU9x5q5wszWmmHd5ey/media/6a3c30ed817563b473dca76b.mp4",
    poster:
      "https://assets.cdn.filesafe.space/yblU9x5q5wszWmmHd5ey/media/6a3c3e47ae7d4768394e1afd.png",
  },
} as const;

export const EXTERNAL_LINKS = {
  whatsapp: "https://chat.whatsapp.com/LWOO3dw2nJUKCXypnc6LY6",
  calendly:
    "https://calendly.com/jean-kaluza/app-idea-day-1-facilitation-clone",
  pilotForm: "https://jq8ounso.forms.app/freethebrains-participation",
  instagram:
    "https://www.instagram.com/freebrainsmove?igsh=ZTloaDF3dzNscWVm",
  facebook: "https://www.facebook.com/share/1HsPvX6Hfz/",
  tiktok: "https://www.tiktok.com/@freebrainmoves?_r=1&_t=ZT-97cJndA26dK",
} as const;

export const conditions: Condition[] = [
  { name: "Migraines", icon: Zap },
  { name: "Parkinson's Disease", icon: Activity },
  { name: "Alzheimer's", icon: Brain },
  { name: "Essential Tremor", icon: Waves },
  { name: "Cognitive Impairments", icon: BrainCircuit },
  { name: "ALS", icon: Dna },
  { name: "Cerebrovascular Disease", icon: HeartPulse },
  { name: "Huntington's Disease", icon: Microscope },
  { name: "Multiple Sclerosis (MS)", icon: ShieldAlert },
  { name: "Epilepsy", icon: Activity },
  { name: "Spina Bifida", icon: Baby },
  { name: "Dystonias", icon: Activity },
  { name: "Dementia", icon: Brain },
  { name: "Cerebral Palsy", icon: Accessibility },
  { name: "Diabetic Neuropathy", icon: Footprints },
];

export const evidenceData: EvidenceItem[] = [
  {
    id: 1,
    quote:
      "High-intensity exercise induces brain-protective effects that have the potential to not just slow down, but possibly reverse, the neurodegeneration associated with Parkinson's disease, a new pilot study suggests.",
    url: "https://medicine.yale.edu/news-article/high-intensity-exercise-can-reverse-neurodegeneration-in-parkinsons-disease/",
    title: "Yale School of Medicine",
  },
  {
    id: 2,
    quote:
      "Dance, in fact, has such beneficial effects on the brain that it is now being used to treat people with Parkinson's disease",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9394857/",
    title: "NCBI",
  },
  {
    id: 3,
    quote:
      "The right kind of treatment and rehabilitation programs can help promote neuroplasticity",
    url: "https://neuliferehab.com/neuroplasticity-movement-is-a-medicine/",
    title: "NeuLife Rehab",
  },
  {
    id: 4,
    quote:
      "therapeutic dancing can be beneficial for improving motor performance and balance in people with PD",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9394857/",
    title: "NCBI",
  },
  {
    id: 5,
    quote:
      "Exercise can help preserve and improve cognitive function and fend off dementia, stroke, depression and anxiety. Aim for 150 minutes per week.",
    url: "https://health.clevelandclinic.org/exercise-and-brain-health",
    title: "Cleveland Clinic",
  },
];

export const neuralNodes: NeuralNode[] = [
  { id: 1, cx: 25, cy: 55 },
  { id: 2, cx: 75, cy: 48 },
  { id: 3, cx: 50, cy: 70 },
  { id: 4, cx: 35, cy: 88 },
  { id: 5, cx: 80, cy: 85 },
];

export const socialFeeds: SocialFeed[] = [
  {
    platform: "Instagram",
    handle: "@freebrainsmove",
    icon: Instagram,
    link: EXTERNAL_LINKS.instagram,
    image:
      "https://assets.cdn.filesafe.space/yblU9x5q5wszWmmHd5ey/media/6a4288cf0c7afddf14735214.png",
    caption:
      "Movement is medicine. 🧠✨ Follow us as we inspire, explore neuroplasticity",
    likes: "1.2k",
    comments: "84",
    type: "image",
  },
  {
    platform: "Facebook",
    handle: "FreeBrain",
    icon: Facebook,
    link: EXTERNAL_LINKS.facebook,
    image:
      "https://vibe.filesafe.space/1782179753705442134/attachments/ed96f2b4-6c88-4bb9-af11-2557e982e6ee.png",
    caption:
      "Our facebook community continues to grow! Today we're sharing inspiring stories from FreeBrainers who have seen incredible progress.",
    likes: "856",
    comments: "42",
    type: "image",
  },
  {
    platform: "TikTok",
    handle: "@freebrainmoves",
    icon: TikTokIcon,
    link: EXTERNAL_LINKS.tiktok,
    video:
      "https://assets.cdn.filesafe.space/yblU9x5q5wszWmmHd5ey/media/691d307e6d309e7db8282a94.mp4",
    caption:
      "Quick 60-second exercise you can do anywhere to stimulate your neuro-pathways! #FreeBrain #Neuroplasticity #MovementTherapy",
    likes: "5.4k",
    comments: "320",
    type: "video",
  },
];
