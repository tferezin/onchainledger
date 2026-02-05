import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OnChainLedger API',
      version: '1.0.0',
      description: `
# Token Intelligence API for Solana

OnChainLedger provides AI-powered token analysis to detect scams, honeypots, and rug pulls before you trade.

## Features

- **10 Specialized Analyzers**: Authority, Holders, Liquidity, Honeypot, Token-2022, LP Lock, Insider, Wallet Clusters, Price History, Age
- **TrustScore**: 0-100 composite score with letter grade (A+ to F)
- **x402 Micropayments**: Pay-per-request with SOL, no API keys needed

## Authentication

This API uses the **x402 payment protocol** for paid endpoints.

### Free Endpoints
- \`GET /health\` - Health check
- \`GET /score/:token\` - Basic trust score
- \`GET /docs\` - This documentation

### Paid Endpoints (x402)
- \`POST /analyze/:token\` - Full analysis ($0.01)
- \`POST /analyze/batch\` - Batch analysis (volume discounts)
- \`POST /compare\` - Token comparison ($0.015)

### How x402 Works
1. Call paid endpoint without payment → Receive \`402 Payment Required\` with payment instructions
2. Send SOL to the specified wallet
3. Retry with transaction signature in \`X-Payment\` header
4. Receive analysis results
      `,
      contact: {
        name: 'OnChainLedger',
        url: 'https://onchainledger-production.up.railway.app'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://onchainledger-production.up.railway.app',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Free', description: 'Free endpoints - no payment required' },
      { name: 'Paid', description: 'Paid endpoints - x402 payment required' }
    ],
    components: {
      schemas: {
        TrustScore: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 0, maximum: 100, example: 88 },
            grade: { type: 'string', enum: ['A+', 'A', 'B', 'C', 'D', 'F'], example: 'A' },
            verdict: { type: 'string', example: 'HIGH CONFIDENCE' }
          }
        },
        TokenInfo: {
          type: 'object',
          properties: {
            address: { type: 'string', example: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
            symbol: { type: 'string', example: 'BONK' },
            name: { type: 'string', example: 'Bonk' },
            decimals: { type: 'integer', example: 5 }
          }
        },
        ScoreResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
            symbol: { type: 'string', example: 'BONK' },
            name: { type: 'string', example: 'Bonk' },
            score: { type: 'integer', example: 88 },
            grade: { type: 'string', example: 'A' },
            verdict: { type: 'string', example: 'HIGH CONFIDENCE' },
            message: { type: 'string', example: 'For full analysis with risk breakdown, use POST /analyze/:token' },
            cachedAt: { type: 'string', format: 'date-time' },
            cacheExpiresIn: { type: 'string', example: '30 minutes' }
          }
        },
        AnalysisResponse: {
          type: 'object',
          properties: {
            token: { $ref: '#/components/schemas/TokenInfo' },
            trustScore: { $ref: '#/components/schemas/TrustScore' },
            breakdown: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  score: { type: 'integer' },
                  weighted: { type: 'number' },
                  details: { type: 'object' }
                }
              }
            },
            riskFactors: { type: 'array', items: { type: 'string' } },
            positiveFactors: { type: 'array', items: { type: 'string' } },
            metadata: {
              type: 'object',
              properties: {
                analyzedAt: { type: 'string', format: 'date-time' },
                cacheExpires: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        BatchRequest: {
          type: 'object',
          required: ['tokens'],
          properties: {
            tokens: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              maxItems: 20,
              example: ['DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']
            }
          }
        },
        BatchResponse: {
          type: 'object',
          properties: {
            results: { type: 'array', items: { $ref: '#/components/schemas/AnalysisResponse' } },
            summary: {
              type: 'object',
              properties: {
                analyzed: { type: 'integer' },
                safest: { type: 'object' },
                riskiest: { type: 'object' }
              }
            },
            pricing: {
              type: 'object',
              properties: {
                perToken: { type: 'number' },
                total: { type: 'number' },
                discount: { type: 'string' }
              }
            }
          }
        },
        CompareRequest: {
          type: 'object',
          required: ['tokens'],
          properties: {
            tokens: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              maxItems: 5,
              example: ['DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr']
            }
          }
        },
        CompareResponse: {
          type: 'object',
          properties: {
            comparison: { type: 'array', items: { type: 'object' } },
            winner: { type: 'object' },
            recommendation: { type: 'string' }
          }
        },
        PaymentRequired: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Payment Required' },
            x402Version: { type: 'integer', example: 1 },
            accepts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  scheme: { type: 'string', example: 'exact' },
                  network: { type: 'string', example: 'solana-mainnet' },
                  maxAmountRequired: { type: 'string', example: '10000' },
                  payTo: { type: 'string', example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' }
                }
              }
            },
            message: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            version: { type: 'string', example: '1.0.0' },
            config: {
              type: 'object',
              properties: {
                heliusConfigured: { type: 'boolean' },
                birdeyeConfigured: { type: 'boolean' }
              }
            }
          }
        }
      },
      securitySchemes: {
        x402Payment: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Payment',
          description: 'Solana transaction signature for x402 payment'
        }
      }
    },
    paths: {
      '/health': {
        get: {
          tags: ['Free'],
          summary: 'Health check',
          description: 'Check API health and configuration status',
          responses: {
            '200': {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' }
                }
              }
            }
          }
        }
      },
      '/score/{tokenAddress}': {
        get: {
          tags: ['Free'],
          summary: 'Get basic trust score (FREE)',
          description: 'Returns basic trust score without full breakdown. Rate limited to 10 requests/minute. Cached for 30 minutes.',
          parameters: [
            {
              name: 'tokenAddress',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Solana token mint address',
              example: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
            }
          ],
          responses: {
            '200': {
              description: 'Basic trust score',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ScoreResponse' }
                }
              }
            },
            '400': {
              description: 'Invalid token address',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '429': {
              description: 'Rate limit exceeded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      },
      '/analyze/{tokenAddress}': {
        post: {
          tags: ['Paid'],
          summary: 'Full token analysis (x402 - $0.01)',
          description: 'Returns complete trust score with detailed breakdown of all 10 analyzers, risk factors, and positive indicators.',
          security: [{ x402Payment: [] }],
          parameters: [
            {
              name: 'tokenAddress',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Solana token mint address',
              example: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
            }
          ],
          responses: {
            '200': {
              description: 'Full analysis result',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AnalysisResponse' }
                }
              }
            },
            '400': {
              description: 'Invalid token address',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '402': {
              description: 'Payment required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PaymentRequired' }
                }
              }
            }
          }
        }
      },
      '/analyze/batch': {
        post: {
          tags: ['Paid'],
          summary: 'Batch token analysis (x402 - volume discounts)',
          description: 'Analyze multiple tokens in one request. Volume discounts: 2-5 tokens (20% off), 6-10 (30% off), 11+ (40% off). Max 20 tokens.',
          security: [{ x402Payment: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Batch analysis results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/BatchResponse' }
                }
              }
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '402': {
              description: 'Payment required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PaymentRequired' }
                }
              }
            }
          }
        }
      },
      '/compare': {
        post: {
          tags: ['Paid'],
          summary: 'Compare tokens (x402 - $0.015)',
          description: 'Compare 2-5 tokens side by side with strengths, weaknesses, and AI recommendation.',
          security: [{ x402Payment: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CompareRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Comparison results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CompareResponse' }
                }
              }
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '402': {
              description: 'Payment required',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PaymentRequired' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: []
};

export const swaggerSpec = swaggerJsdoc(options);
