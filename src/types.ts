/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ChannelGroup = 'default' | 'openai官-优质' | 'gemini优质' | 'gemini-t3' | 'origin';

export interface KeyGroup {
  id: string;
  name: string;
  key: string;
  group?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  keyGroupId?: string; // Reference to KeyGroup id
  baseUrl?: string;
  group?: string;
  category: 'Chat' | 'Image' | 'Video' | 'Music' | 'Tool';
  isCustom?: boolean;
}

export interface GlobalConfig {
  baseUrl: string;
  keyGroups: KeyGroup[];
  defaultKeyGroupId: string;
  group?: string;
}

export interface PromptItem {
  id: string;
  text: string;
  label: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
  params: any;
}
