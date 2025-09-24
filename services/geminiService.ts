import { GoogleGenAI, Type, VideosOperation, Part } from "@google/genai";
import { ProductDetails, Script } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const filesToGenerativeParts = (files: File[]): Promise<Part[]> => {
  const filePromises = files.map(file => {
    return new Promise<Part>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve({
            inlineData: {
              data: reader.result.split(',')[1],
              mimeType: file.type
            }
          });
        } else {
            reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(filePromises);
};

export const analyzeAndSuggest = async (files: File[], productName: string): Promise<string[]> => {
  const imageParts = await filesToGenerativeParts(files);
  const prompt = `Analyze the attached product images for a product named '${productName}'. 
  1. Identify the specific product category.
  2. Identify the primary use cases.
  3. Based on this category, search and identify the top 3-4 most common and effective types of video advertisements used by competitors (e.g., 'Problem-Solution Ad,' 'Customer Testimonial Style,' 'Aesthetic Showcase,' 'Unboxing & First Impression').
  Return these as concise, actionable suggestions for a user.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [...imageParts, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
      },
    },
  });

  const parsedResponse = JSON.parse(response.text);
  return parsedResponse.suggestions || [];
};

export const generateScript = async (files: File[], details: ProductDetails): Promise<Script> => {
    const imageParts = await filesToGenerativeParts(files);
    const prompt = `Act as an expert marketing copywriter. Create a short, compelling 30-second video script for a product named '${details.productName}'.
    The video format is a '${details.selectedAdType}' with a '${details.videoStyle}' tone.
    The user's core idea is: '${details.videoIdea}'.
    Base the script on the visual information from the provided product images. Structure the script into 3 distinct scenes with visual cues and a voiceover for each.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scene_1: {
                        type: Type.OBJECT,
                        properties: {
                            visual: { type: Type.STRING },
                            voiceover: { type: Type.STRING },
                        }
                    },
                    scene_2: {
                        type: Type.OBJECT,
                        properties: {
                            visual: { type: Type.STRING },
                            voiceover: { type: Type.STRING },
                        }
                    },
                    scene_3: {
                        type: Type.OBJECT,
                        properties: {
                            visual: { type: Type.STRING },
                            voiceover: { type: Type.STRING },
                        }
                    },
                },
            },
        },
    });

    return JSON.parse(response.text);
};


export const generateVideo = async (file: File, script: Script, details: ProductDetails): Promise<VideosOperation> => {
    const scriptText = `
        Scene 1: ${script.scene_1.visual} (Voiceover: ${script.scene_1.voiceover})
        Scene 2: ${script.scene_2.visual} (Voiceover: ${script.scene_2.voiceover})
        Scene 3: ${script.scene_3.visual} (Voiceover: ${script.scene_3.voiceover})
    `;

    const prompt = `Using the attached seed image, create a promotional video for a product named "${details.productName}".
    The video should follow this script: ${scriptText}.
    The overall aesthetic should be '${details.videoStyle}'.
    This is a '${details.selectedAdType}' video. Make it engaging and professional.`;

    const imagePart = await filesToGenerativeParts([file]);

    const operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image: {
            imageBytes: imagePart[0].inlineData.data,
            mimeType: imagePart[0].inlineData.mimeType,
        },
        config: {
            numberOfVideos: 1,
        },
    });

    return operation;
};

export const checkVideoStatus = async (operation: VideosOperation): Promise<VideosOperation> => {
    return ai.operations.getVideosOperation({ operation: operation });
}