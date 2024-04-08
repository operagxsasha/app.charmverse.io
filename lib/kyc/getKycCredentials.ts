import type { PersonaCredential, SynapsCredential } from '@charmverse/core/prisma-client';
import { prisma } from '@charmverse/core/prisma-client';

export type KycCredentials = {
  synaps: Omit<SynapsCredential, 'id'> | null;
  persona: Omit<PersonaCredential, 'id'> | null;
};

export async function getKycCredentials(spaceId: string): Promise<KycCredentials> {
  const synapsCredential = await prisma.synapsCredential.findUnique({
    where: {
      spaceId
    }
  });

  const personaCredential = await prisma.personaCredential.findUnique({
    where: {
      spaceId
    }
  });

  return { synaps: synapsCredential, persona: personaCredential };
}
