'use server';

import { AIServiceFactory } from '@/lib/ai/service';
import { HuggingFaceProvider } from '@/lib/ai/providers/huggingface';

// Register provider (in a real app, this might happen in an init file)
AIServiceFactory.register(new HuggingFaceProvider());

/**
 * Generates an image description using the registered AI provider.
 */
export async function generateDescription(imageUrl: string): Promise<string> {
  const aiService = AIServiceFactory.getService();
  return aiService.generateDescription(imageUrl);
}
