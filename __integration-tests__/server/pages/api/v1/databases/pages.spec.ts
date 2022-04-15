import request, { Response } from 'supertest';
// eslint-disable-next-line @next/next/no-server-import-in-page

import { baseUrl } from 'testing/mockApiCall';
import { generateUserAndSpaceWithApiToken } from 'testing/setupDatabase';
import { createDatabase } from 'lib/public-api/createDatabaseCardPage';
import { v4 } from 'uuid';

import { Space, User, Page, SpaceApiToken } from '@prisma/client';
import { Page as ApiPage, UnsupportedKeyDetails, UnsupportedKeysError } from 'lib/public-api';

let database: Page;
let user: User;
let space: Space;
let apiToken: SpaceApiToken;

// Setup value we can assert against, ignore the rest of the request
let failedCreateResponse: {body: UnsupportedKeysError};

function invalidCreateRequest (): Promise<Response> {
  return request(baseUrl)
    .post(`/api/v1/databases/${database.boardId}/pages`)
    .set('Authorization', `Bearer ${apiToken.token}`)
    .send({
      title: 'Example',
      unsupportedProperty: ''
    });
}

beforeAll(async () => {
  const generated = await generateUserAndSpaceWithApiToken(v4());
  user = generated.user;
  space = generated.space;
  apiToken = generated.apiToken;

  database = await createDatabase({
    title: 'Example title',
    createdBy: user.id,
    spaceId: space.id
  });

  failedCreateResponse = await invalidCreateRequest();
});

describe('POST /databases/{id}/pages', () => {

  it('should create a new card in the database', async () => {

    const response = await request(baseUrl)
      .post(`/api/v1/databases/${database.boardId}/pages`)
      .set('Authorization', `Bearer ${apiToken.token}`)
      .send({
        title: 'Example',
        properties: {}
      });

    //    TODO; // HANDLE EMPTY PROPERTIES

    expect(response.body).toEqual<ApiPage>(
      expect.objectContaining<ApiPage>({
        content: expect.any(Object),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        databaseId: expect.any(String),
        id: expect.any(String),
        isTemplate: expect.any(Boolean),
        properties: expect.any(Object),
        spaceId: expect.any(String),
        title: expect.any(String)
      })
    );

  });

  it('should create a new card in the database without needing custom properties', async () => {

    const response = await request(baseUrl)
      .post(`/api/v1/databases/${database.boardId}/pages`)
      .set('Authorization', `Bearer ${apiToken.token}`)
      .send({
        title: 'Example'
      });

    //    TODO; // HANDLE EMPTY PROPERTIES

    expect(response.body).toEqual<ApiPage>(
      expect.objectContaining<ApiPage>({
        content: expect.any(Object),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        databaseId: expect.any(String),
        id: expect.any(String),
        isTemplate: expect.any(Boolean),
        properties: expect.any(Object),
        spaceId: expect.any(String),
        title: expect.any(String)
      })
    );

  });

  it('should fail with 400 error code when a title is not provided', async () => {

    const response = await request(baseUrl)
      .post(`/api/v1/databases/${database.boardId}/pages`)
      .set('Authorization', `Bearer ${apiToken.token}`)
      .send({
      });

    expect(response.statusCode).toBe(400);

  });

  it('should fail with 400 error code when invalid properties are provided', async () => {

    const response = await invalidCreateRequest();

    expect(response.statusCode).toBe(400);

  });

  it('should inform the user which invalid properties were provided', async () => {

    expect((failedCreateResponse.body.error as UnsupportedKeyDetails).unsupportedKeys).toContain('unsupportedProperty');

  });

  it('should inform the user which valid properties are available', async () => {

    expect((failedCreateResponse.body.error).allowedKeys).toBeInstanceOf(Array);

  });

});

