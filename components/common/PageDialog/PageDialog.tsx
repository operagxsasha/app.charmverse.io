import { log } from '@charmverse/core/log';
import { AvailablePagePermissions } from '@charmverse/core/permissions/flags';
import type { Page } from '@charmverse/core/prisma';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { Box } from '@mui/material';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef } from 'react';

import charmClient from 'charmClient/charmClient';
import { trackPageView } from 'charmClient/hooks/track';
import { DocumentPage } from 'components/[pageId]/DocumentPage/DocumentPage';
import { DocumentPageProviders } from 'components/[pageId]/DocumentPage/DocumentPageProviders';
import { Button } from 'components/common/Button';
import Dialog from 'components/common/DatabaseEditor/components/dialog';
import { useCharmEditor } from 'hooks/useCharmEditor';
import { useCurrentPage } from 'hooks/useCurrentPage';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { usePage } from 'hooks/usePage';
import { usePages } from 'hooks/usePages';
import debouncePromise from 'lib/utils/debouncePromise';

import { FullPageActionsMenuButton } from '../PageActions/FullPageActionsMenuButton';
import { DocumentHeaderElements } from '../PageLayout/components/Header/components/DocumentHeaderElements';

interface Props {
  pageId?: string;
  onClose: () => void;
  readOnly?: boolean;
  hideToolsMenu?: boolean;
  showCard?: (cardId: string | null) => void;
  currentBoardId?: string; // the board we are looking at, to determine if we should show the parent chip
}
function PageDialogBase(props: Props) {
  const { hideToolsMenu = false, currentBoardId, pageId, readOnly, showCard } = props;

  const mounted = useRef(false);
  const popupState = usePopupState({ variant: 'popover', popupId: 'page-dialog' });
  const router = useRouter();
  const { space } = useCurrentSpace();
  const { setCurrentPageId } = useCurrentPage();
  const { editMode, resetPageProps, setPageProps } = useCharmEditor();

  const { updatePage } = usePages();
  const { page } = usePage({ pageIdOrPath: pageId });
  const pagePermissions = page?.permissionFlags || new AvailablePagePermissions().full;
  const domain = router.query.domain as string;
  const fullPageUrl = page?.path ? `/${domain}/${page?.path}` : null;

  const readOnlyPage = readOnly || !pagePermissions?.edit_content;

  const contentType = pageId ? 'page' : null;

  // keep track if charmeditor is mounted. There is a bug that it calls the update method on closing the modal, but content is empty
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // open modal when page is set
  useEffect(() => {
    if (contentType) {
      popupState.open();
    }
  }, [!!contentType]);

  useEffect(() => {
    if (page?.id && space) {
      trackPageView({
        spaceId: page.spaceId,
        pageId: page.id,
        type: page.type,
        spaceDomain: domain,
        spaceCustomDomain: space.customDomain
      });
      if (space.domain === 'op-grants') {
        charmClient.track.trackActionOp('page_view', {
          type: page.type,
          path: page.path,
          url: window.location.href
        });
      }
    }
  }, [page?.id, space?.customDomain]);

  function close() {
    popupState.close();
    props.onClose();
  }

  useEffect(() => {
    if (contentType === null && popupState.isOpen) {
      close();
    }
  }, [contentType, popupState.isOpen]);

  useEffect(() => {
    if (page?.id) {
      setCurrentPageId(page?.id);
    }
    return () => {
      setCurrentPageId('');
      resetPageProps();
    };
  }, [page?.id]);

  // set page attributes of the primary charm editor
  useEffect(() => {
    if (!page) {
      // wait for pages loaded for permissions to be correct
      return;
    }
    if (!editMode) {
      if (page.permissionFlags.edit_content) {
        setPageProps({ permissions: page.permissionFlags, editMode: 'editing' });
      } else {
        setPageProps({ permissions: page.permissionFlags, editMode: 'viewing' });
      }
    } else {
      // pass editMode thru to fix hot-reloading which resets the prop
      setPageProps({ permissions: page.permissionFlags, editMode });
    }
  }, [page?.permissionFlags.edit_content]);

  const savePage = useCallback(
    debouncePromise(async (updates: Partial<Page>) => {
      if (!page || !mounted.current) {
        return;
      }
      updatePage({ id: page.id, ...updates }).catch((err: any) => {
        log.error('Error saving page', err);
      });
    }, 500),
    [page]
  );
  if (!popupState.isOpen) {
    return null;
  }

  return (
    <Dialog
      toolsMenu={
        contentType === 'page' &&
        !hideToolsMenu &&
        !readOnly &&
        page && <FullPageActionsMenuButton isInsideDialog page={page} onDelete={close} />
      }
      toolbar={
        contentType === 'page' && (
          <Box display='flex' justifyContent='space-between'>
            <Button
              data-test='open-as-page'
              size='small'
              color='secondary'
              href={fullPageUrl}
              onClick={close}
              variant='text'
              startIcon={<OpenInFullIcon fontSize='small' />}
              sx={{ px: 1.5 }}
            >
              Open as Page
            </Button>
            {page && (
              <Box display='flex' alignItems='center' gap={0.5}>
                <DocumentHeaderElements headerHeight={0} page={page} />
              </Box>
            )}
          </Box>
        )
      }
      onClose={close}
    >
      {page && contentType === 'page' && (
        <DocumentPage
          showParentChip={currentBoardId !== page.parentId} // show parent chip if parent is not the current board
          showCard={showCard}
          insideModal
          page={page}
          savePage={savePage}
          readOnly={readOnlyPage}
        />
      )}
    </Dialog>
  );
}

// PageDialogBase must be wrapped by DocumentPageProviders so that it can control context about the page
export function PageDialog(props: Props): JSX.Element | null {
  return (
    <DocumentPageProviders>
      <PageDialogBase {...props} />
    </DocumentPageProviders>
  );
}
