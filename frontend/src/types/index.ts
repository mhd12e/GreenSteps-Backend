export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ImpactStepPayloadResponse {
    id: string;
    title: string;
    descreption: string; // Keep typo from backend
    description?: string; // Fallback
    icon: string;
}

export interface ImpactPayloadResponse {
    id: string;
    title: string;
    descreption: string;
    description?: string;
    steps: Record<string, ImpactStepPayloadResponse>;
}

export interface ImpactListResponse {
  impact_ids: string[];
}

export interface VoiceTokenResponse {
    token: string;
    expire_time: string;
    new_session_expire_time: string;
    model: string;
}

export interface UserProfileResponse {
    full_name: string;
    age: number | null;
    interests: string[];
}

export interface UserProfileUpdateRequest {
    full_name?: string;
    age?: number;
    interests?: string[];
}

export interface ImpactStepResponse {
    id: string;
    order: number;
    title: string;
    description: string;
    icon: string;
}

export interface ImpactResponse {
    id: string;
    title: string;
    description: string;
    steps: ImpactStepResponse[];
}