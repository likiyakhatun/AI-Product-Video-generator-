export enum VideoStyle {
  MODERN = "Modern & Sleek",
  ADVENTUROUS = "Energetic & Adventurous",
  LUXURIOUS = "Elegant & Luxurious",
  MINIMALIST = "Minimalist & Clean",
}

export interface ProductDetails {
  productName: string;
  videoIdea: string;
  selectedAdType: string;
  videoStyle: VideoStyle;
}

export interface Scene {
  visual: string;
  voiceover: string;
}

export interface Script {
  scene_1: Scene;
  scene_2: Scene;
  scene_3: Scene;
}
