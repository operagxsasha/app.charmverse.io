import type { Page } from '@prisma/client';
import { useCallback, useEffect, useRef } from 'react';

import DocumentPage from 'components/[pageId]/DocumentPage';
import { usePages } from 'hooks/usePages';
import type { Card } from 'lib/focalboard/card';
import log from 'lib/log';
import type { PageUpdates } from 'lib/pages';
import debouncePromise from 'lib/utilities/debouncePromise';

type Props = {
  card: Card;
  readOnly: boolean;
};

function CardDetail(props: Props): JSX.Element | null {
  const { card, readOnly } = props;

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const { pages, updatePage } = usePages();

  const debouncedPageUpdate = debouncePromise(async (updates: PageUpdates) => {
    const updatedPage = await updatePage(updates);
    return updatedPage;
  }, 500);

  const setPage = useCallback(
    async (updates: Partial<Page>) => {
      if (mounted.current) {
        debouncedPageUpdate({ id: card.id, ...updates } as Partial<Page>).catch((err: any) => {
          log.error('Error saving page', err);
        });
      }
    },
    [card]
  );

  const page = pages[card?.id];
  if (!card || !page) {
    return null;
  }
  return <DocumentPage page={page} setPage={setPage} readOnly={readOnly} />;
}

export default CardDetail;
