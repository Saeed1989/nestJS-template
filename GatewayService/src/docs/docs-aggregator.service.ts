import { Injectable, Logger } from '@nestjs/common';

interface OpenApiDocument {
  openapi: string;
  info: Record<string, unknown>;
  paths: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

@Injectable()
export class DocsAggregatorService {
  private readonly logger = new Logger(DocsAggregatorService.name);

  async buildMergedDocument(): Promise<OpenApiDocument> {
    const merged: OpenApiDocument = {
      openapi: '3.0.0',
      info: {
        title: 'API Gateway — Aggregated Docs',
        description:
          'Combined OpenAPI documentation for all services proxied by the gateway.',
        version: '1.0.0',
      },
      paths: {},
      components: {
        schemas: {},
      },
    };

    const sources: { url: string; tag: string }[] = [
      {
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        tag: 'Auth & Config',
      },
      {
        url: process.env.DATA_SERVICE_URL || 'http://localhost:3000',
        tag: 'Data',
      },
    ];

    for (const source of sources) {
      const document = await this.fetchDocument(source.url);
      if (document) {
        this.mergeDocument(merged, document, source.tag);
      }
    }

    return merged;
  }

  private async fetchDocument(
    baseUrl: string,
  ): Promise<OpenApiDocument | null> {
    const url = `${baseUrl.replace(/\/+$/, '')}/docs-json`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch OpenAPI doc from ${url}: HTTP ${response.status}`,
        );
        return null;
      }
      return (await response.json()) as OpenApiDocument;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch OpenAPI doc from ${url}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  private mergeDocument(
    merged: OpenApiDocument,
    document: OpenApiDocument,
    tag: string,
  ): void {
    for (const [path, pathItem] of Object.entries(document.paths || {})) {
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!operation) continue;
        operation.tags = [tag, ...(operation.tags || [])];
      }
      merged.paths[path] = pathItem;
    }

    if (document.components?.schemas) {
      Object.assign(merged.components.schemas, document.components.schemas);
    }
  }
}
