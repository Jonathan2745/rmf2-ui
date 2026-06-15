import type {
  Client as ClientGen,
  ClientOptions as ClientOptionsGen,
} from '@/map/generated/client';
import { createClient } from '@/map/generated/client';

import type {
  LifDocument as LifDocumentPayload,
  RobotsResponse as RobotsResponsePayload,
  RobotConfig as RobotConfigPayload,
} from '@/map/generated/types.gen';

import {
  getSceneConfigApiSceneGet,
  getRobotsApiRobotsGet,
  updateRobotsApiRobotsPut,
  getLifEditorLayoutApiLifEditorLayoutGet,
  updateLifEditorLayoutApiLifEditorLayoutPut,
} from '@/map/generated/sdk.gen';

export type ClientOptions = ClientOptionsGen;

export type SceneConfig = {
  sceneUrl: string;
  robotModelUrl: string;
  robotsConfigUrl: string;
  robotConfigRefreshMs: number;
  lifEditorUrl: string;
};

export type RobotsResponse = RobotsResponsePayload;
export type RobotConfig = RobotConfigPayload;
export type LifDocument = LifDocumentPayload;

type ApiResult<T> = {
  data?: T;
  error?: unknown;
};

export class Client {
  private _client: ClientGen;
  private _baseUrl: string;

  constructor(options: ClientOptions) {
    this._client = createClient(options);
    this._baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
  }

  private unwrap<T>(result: ApiResult<T>, endpoint: string): T {
    if (result.error) {
      throw new Error(`${endpoint} failed: ${JSON.stringify(result.error)}`);
    }

    if (result.data === undefined || result.data === null) {
      throw new ReferenceError(`${endpoint} failed: data is undefined.`);
    }

    return result.data;
  }

  private buildUrl(path: string): string {
    return `${this._baseUrl}${path}`;
  }

  async getSceneConfig(): Promise<SceneConfig> {
    const result = await getSceneConfigApiSceneGet({
      client: this._client,
    });

    return this.unwrap(result, 'GET /api/scene') as SceneConfig;
  }

  async getRobots(): Promise<RobotsResponse> {
    const result = await getRobotsApiRobotsGet({
      client: this._client,
    });

    return this.unwrap(result, 'GET /api/robots');
  }

  async updateRobots(payload: RobotsResponse): Promise<RobotsResponse> {
    const result = await updateRobotsApiRobotsPut({
      client: this._client,
      body: payload,
    });

    return this.unwrap(result, 'PUT /api/robots');
  }

  async getLifEditorLayout(): Promise<LifDocument> {
    const result = await getLifEditorLayoutApiLifEditorLayoutGet({
      client: this._client,
    });

    return this.unwrap(result, 'GET /api/lif-editor/layout');
  }

  async updateLifEditorLayout(payload: LifDocument): Promise<LifDocument> {
    const result = await updateLifEditorLayoutApiLifEditorLayoutPut({
      client: this._client,
      body: payload,
    });

    return this.unwrap(result, 'PUT /api/lif-editor/layout');
  }

  async importLifEditorLayout(file: File): Promise<LifDocument> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(this.buildUrl('/api/lif-editor/import'), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `POST /api/lif-editor/import failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<LifDocument>;
  }

  async exportCurrentLifEditorLayout(): Promise<Blob> {
    const response = await fetch(this.buildUrl('/api/lif-editor/export'), {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(
        `GET /api/lif-editor/export failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.blob();
  }

  async exportLifEditorLayout(payload: LifDocument): Promise<Blob> {
    const response = await fetch(this.buildUrl('/api/lif-editor/export'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `POST /api/lif-editor/export failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.blob();
  }
}
