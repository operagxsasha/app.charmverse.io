/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable max-lines */

import CallMadeIcon from '@mui/icons-material/CallMade';
import LaunchIcon from '@mui/icons-material/LaunchOutlined';
import { Box, Typography, Link } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import type { Page } from '@prisma/client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Hotkeys from 'react-hot-keys';
import type { WrappedComponentProps } from 'react-intl';
import { injectIntl } from 'react-intl';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import { mutate } from 'swr';
import { v4 as uuid } from 'uuid';

import charmClient from 'charmClient';
import PageBanner, { randomBannerImage } from 'components/[pageId]/DocumentPage/components/PageBanner';
import PageDeleteBanner from 'components/[pageId]/DocumentPage/components/PageDeleteBanner';
import { createTableView } from 'components/common/BoardEditor/focalboard/src/components/addViewMenu';
import { getBoard } from 'components/common/BoardEditor/focalboard/src/store/boards';
import type { CardPage } from 'components/common/BoardEditor/focalboard/src/store/cards';
import {
  getViewCardsSortedFilteredAndGrouped,
  sortCards
} from 'components/common/BoardEditor/focalboard/src/store/cards';
import { useAppSelector } from 'components/common/BoardEditor/focalboard/src/store/hooks';
import { getLoadingState } from 'components/common/BoardEditor/focalboard/src/store/loadingState';
import Button from 'components/common/Button';
import LoadingComponent from 'components/common/LoadingComponent';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { useMembers } from 'hooks/useMembers';
import { usePages } from 'hooks/usePages';
import type { Block } from 'lib/focalboard/block';
import type { Board, BoardGroup, IPropertyOption, IPropertyTemplate } from 'lib/focalboard/board';
import type { BoardView, BoardViewFields } from 'lib/focalboard/boardView';
import type { Card } from 'lib/focalboard/card';
import { createCard } from 'lib/focalboard/card';
import { createNewDataSource } from 'lib/pages/createNewDataSource';

import { CardFilter } from '../cardFilter';
import mutator from '../mutator';
import { addCard as _addCard, addTemplate } from '../store/cards';
import { updateView } from '../store/views';
import { Utils } from '../utils';

import { CreateLinkedView } from './createLinkedView';
import Gallery from './gallery/gallery';
import Kanban from './kanban/kanban';
import Table from './table/table';
import ViewHeader from './viewHeader/viewHeader';
import ViewSidebar from './viewSidebar/viewSidebar';
import ViewTitle, { InlineViewTitle } from './viewTitle';

const CalendarFullView = dynamic(() => import('./calendar/fullCalendar'), { ssr: false });

type Props = WrappedComponentProps &
  // eslint-disable-next-line no-use-before-define
  PropsFromRedux & {
    board: Board;
    embeddedBoardPath?: string;
    // cards: Card[]
    activeView?: BoardView;
    views: BoardView[];
    hideBanner?: boolean;
    readOnly: boolean;
    readOnlySourceData: boolean;
    addCard: (card: Card) => void;
    pageIcon?: string | null;
    setPage: (p: Partial<Page>) => void;
    updateView: (view: BoardView) => void;
    showCard: (cardId: string | null) => void;
    showView: (viewId: string) => void;
    disableUpdatingUrl?: boolean;
    maxTabsShown?: number;
    onDeleteView?: (viewId: string) => void;
  };

type State = {
  selectedCardIds: string[];
  cardIdToFocusOnRender: string;
  showSettings: 'create-linked-view' | 'view-options' | null;
};

function CenterPanel(props: Props) {
  const { activeView, board, pageIcon, showView, views } = props;

  const [state, setState] = useState<State>({
    cardIdToFocusOnRender: '',
    selectedCardIds: [],
    // assume this is a page type 'inline_linked_board' or 'linked_board' if no view exists
    showSettings: null
  });

  const [loadingFormResponses, setLoadingFormResponses] = useState(false);

  const router = useRouter();
  const space = useCurrentSpace();
  const { pages, updatePage } = usePages();
  const { members } = useMembers();

  useEffect(() => {
    if (views.length === 0 && !activeView) {
      setState((s) => ({ ...s, showSettings: 'create-linked-view' }));
    } else if (activeView) {
      setState((s) => ({ ...s, showSettings: null }));
    }
  }, [activeView?.id, views.length]);

  const isEmbedded = !!props.embeddedBoardPath;
  const boardPage = pages[board.id];
  const boardPageType = boardPage?.type;

  // for 'linked' boards, each view has its own board which we use to determine the cards to show
  let activeBoardId: string | undefined = props.board.id;
  if (activeView?.fields.linkedSourceId) {
    activeBoardId = activeView?.fields.linkedSourceId;
  } else if (activeView?.fields.sourceType === 'google_form') {
    activeBoardId = activeView?.fields.sourceData?.boardId;
  }

  const activeBoard = useAppSelector(getBoard(activeBoardId ?? ''));
  const activePage = pages[activeBoardId ?? ''];
  const _groupByProperty = activeBoard?.fields.cardProperties.find((o) => o.id === activeView?.fields.groupById);
  const _dateDisplayProperty = activeBoard?.fields.cardProperties.find(
    (o) => o.id === activeView?.fields.dateDisplayPropertyId
  );
  const _cards = useAppSelector(
    getViewCardsSortedFilteredAndGrouped({
      boardId: activeBoard?.id || '',
      viewId: activeView?.id || ''
    })
  );
  // filter cards by whats accessible
  const cardPages: CardPage[] = _cards.map((card) => ({ card, page: pages[card.id]! })).filter(({ page }) => !!page);
  const sortedCardPages = activeView && activeBoard ? sortCards(cardPages, activeBoard, activeView, members) : [];
  const cards = sortedCardPages.map(({ card }) => card);

  let groupByProperty = _groupByProperty;
  if ((!groupByProperty || _groupByProperty?.type !== 'select') && activeView?.fields.viewType === 'board') {
    groupByProperty = activeBoard?.fields.cardProperties.find((o: any) => o.type === 'select');
  }
  let dateDisplayProperty = _dateDisplayProperty;
  if (!dateDisplayProperty && activeView?.fields.viewType === 'calendar') {
    dateDisplayProperty = activeBoard?.fields.cardProperties.find((o: any) => o.type === 'date');
  }

  const { visible: visibleGroups, hidden: hiddenGroups } = activeView
    ? getVisibleAndHiddenGroups(
        cards,
        activeView.fields.visibleOptionIds,
        activeView.fields.hiddenOptionIds,
        groupByProperty
      )
    : { visible: [], hidden: [] };

  const backgroundRef = React.createRef<HTMLDivElement>();
  const keydownHandler = (keyName: string, e: KeyboardEvent) => {
    if (e.target !== document.body || props.readOnly || props.readOnlySourceData) {
      return;
    }

    if (keyName === 'esc') {
      if (state.selectedCardIds.length > 0) {
        setState({ ...state, selectedCardIds: [] });
        e.stopPropagation();
      }
    }

    if (state.selectedCardIds.length > 0) {
      if (keyName === 'del' || keyName === 'backspace') {
        // Backspace or Del: Delete selected cards
        deleteSelectedCards();
        e.stopPropagation();
      }
    }
  };

  function setRandomHeaderImage(_board: Board, headerImage?: string | null) {
    const newHeaderImage = headerImage ?? randomBannerImage();
    // Null is passed if we want to remove the image
    mutator.changeHeaderImage(_board.id, _board.fields.headerImage, headerImage !== null ? newHeaderImage : null);
  }

  function backgroundClicked(e: React.MouseEvent) {
    if (state.selectedCardIds.length > 0) {
      setState({ ...state, selectedCardIds: [] });
      e.stopPropagation();
    }
  }

  const showCard = React.useCallback(
    (cardId: string | null) => {
      if (state.selectedCardIds.length > 0) {
        setState({ ...state, selectedCardIds: [] });
      }
      props.showCard(cardId);
    },
    [props.showCard, state.selectedCardIds]
  );

  const addCard = async (
    groupByOptionId?: string,
    show = false,
    properties: Record<string, string> = {},
    insertLast = true,
    isTemplate = false
  ) => {
    if (!activeBoard) {
      throw new Error('No active view');
    }
    if (!activeView) {
      throw new Error('No active view');
    }

    const card = createCard();

    // TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.CreateCard, {board: board.id, view: activeView.id, card: card.id})

    card.parentId = activeBoard.id;
    card.rootId = activeBoard.rootId;
    const propertiesThatMeetFilters = CardFilter.propertiesThatMeetFilterGroup(
      activeView.fields.filter,
      activeBoard.fields.cardProperties
    );
    if ((activeView.fields.viewType === 'board' || activeView.fields.viewType === 'table') && groupByProperty) {
      if (groupByOptionId) {
        propertiesThatMeetFilters[groupByProperty.id] = groupByOptionId;
      } else {
        delete propertiesThatMeetFilters[groupByProperty.id];
      }
    }
    card.fields.properties = { ...card.fields.properties, ...properties, ...propertiesThatMeetFilters };

    card.fields.contentOrder = [];
    card.fields.isTemplate = isTemplate;

    mutator.performAsUndoGroup(async () => {
      const newCardOrder = insertLast
        ? [...activeView.fields.cardOrder, card.id]
        : [card.id, ...activeView.fields.cardOrder];
      // update view order first so that when we add the block it appears in the right spot
      await mutator.changeViewCardOrder(activeView, newCardOrder, 'add-card');

      await mutator.insertBlock(
        card,
        'add card',
        async (block: Block) => {
          if (space) {
            await mutate(
              `pages/${space.id}`,
              async (_pages: Record<string, Page> | undefined): Promise<Record<string, Page>> => {
                const newPage = await charmClient.pages.getPage(block.id);

                return { ..._pages, [newPage.id]: newPage };
              },
              {
                revalidate: false
              }
            );
          }

          if (isTemplate) {
            showCard(block.id);
          } else if (show) {
            props.addCard(createCard(block));
            props.updateView({ ...activeView, fields: { ...activeView.fields, cardOrder: newCardOrder } });
            showCard(block.id);
          } else {
            // Focus on this card's title inline on next render
            setState({ ...state, cardIdToFocusOnRender: card.id });
            setTimeout(() => setState({ ...state, cardIdToFocusOnRender: '' }), 100);
          }
        },
        async () => {
          showCard(null);
        }
      );
    });
  };

  const editCardTemplate = (cardTemplateId: string) => {
    showCard(cardTemplateId);
  };

  const cardClicked = (e: React.MouseEvent, card: Card): void => {
    const { activeView } = props;

    if (!activeView) {
      return;
    }

    if (e.shiftKey) {
      let selectedCardIds = state.selectedCardIds.slice();
      if (selectedCardIds.length > 0 && (e.metaKey || e.ctrlKey)) {
        // Cmd+Shift+Click: Extend the selection
        const orderedCardIds = cards.map((o) => o.id);
        const lastCardId = selectedCardIds[selectedCardIds.length - 1];
        const srcIndex = orderedCardIds.indexOf(lastCardId);
        const destIndex = orderedCardIds.indexOf(card.id);
        const newCardIds =
          srcIndex < destIndex
            ? orderedCardIds.slice(srcIndex, destIndex + 1)
            : orderedCardIds.slice(destIndex, srcIndex + 1);
        for (const newCardId of newCardIds) {
          if (!selectedCardIds.includes(newCardId)) {
            selectedCardIds.push(newCardId);
          }
        }
        setState({ ...state, selectedCardIds });
      } else {
        // Shift+Click: add to selection
        if (selectedCardIds.includes(card.id)) {
          selectedCardIds = selectedCardIds.filter((o) => o !== card.id);
        } else {
          selectedCardIds.push(card.id);
        }
        setState({ ...state, selectedCardIds });
      }
    } else if (activeView.fields.viewType === 'board' || activeView.fields.viewType === 'gallery') {
      showCard(card.id);
    }

    e.stopPropagation();
  };

  async function deleteSelectedCards() {
    const { selectedCardIds } = state;
    if (selectedCardIds.length < 1) {
      return;
    }

    mutator.performAsUndoGroup(async () => {
      for (const cardId of selectedCardIds) {
        const card = cards.find((o) => o.id === cardId);
        if (card) {
          mutator.deleteBlock(
            card,
            selectedCardIds.length > 1 ? `delete ${selectedCardIds.length} cards` : 'delete card'
          );
        } else {
          Utils.assertFailure(`Selected card not found: ${cardId}`);
        }
      }
    });

    setState({ ...state, selectedCardIds: [] });
  }

  function getVisibleAndHiddenGroups(
    __cards: Card[],
    visibleOptionIds: string[],
    hiddenOptionIds: string[],
    groupByProperty?: IPropertyTemplate
  ): { visible: BoardGroup[]; hidden: BoardGroup[] } {
    let unassignedOptionIds: string[] = [];
    if (groupByProperty) {
      unassignedOptionIds = groupByProperty.options
        .filter((o: IPropertyOption) => !visibleOptionIds.includes(o.id) && !hiddenOptionIds.includes(o.id))
        .map((o: IPropertyOption) => o.id);
    }
    const allVisibleOptionIds = [...visibleOptionIds, ...unassignedOptionIds];

    // If the empty group position is not explicitly specified, make it the first visible column
    if (!allVisibleOptionIds.includes('') && !hiddenOptionIds.includes('')) {
      allVisibleOptionIds.unshift('');
    }

    const _visibleGroups = groupCardsByOptions(__cards, allVisibleOptionIds, groupByProperty);
    const _hiddenGroups = groupCardsByOptions(__cards, hiddenOptionIds, groupByProperty);
    return { visible: _visibleGroups, hidden: _hiddenGroups };
  }

  async function selectViewSource(fields: Pick<BoardViewFields, 'linkedSourceId' | 'sourceData' | 'sourceType'>) {
    const view = createTableView(board);
    view.id = uuid();
    view.fields.sourceData = fields.sourceData;
    view.fields.sourceType = fields.sourceType;
    view.fields.linkedSourceId = fields.linkedSourceId;
    await mutator.insertBlock(view);
    showView(view.id);
  }

  async function createDatabase() {
    if (!boardPageType) {
      throw new Error('No board page type exists');
    }
    const { view } = await createNewDataSource({ board, updatePage, currentPageType: boardPageType });
    showView(view.id);
  }

  function openSelectSource() {
    showView('');
    // delay the sidebar opening so that we dont trigger it to close right away
    setTimeout(() => {
      setState({ ...state, showSettings: 'create-linked-view' });
    });
  }

  function toggleViewOptions(enable?: boolean) {
    enable = enable ?? state.showSettings !== 'view-options';
    const showSettings = enable ? 'view-options' : null;
    // delay the sidebar opening so that we dont trigger it to close right away
    setTimeout(() => {
      setState({ ...state, showSettings });
    });
  }

  function closeSettings() {
    setState({ ...state, showSettings: null });
  }

  // close settings once a view has been added
  useEffect(() => {
    if (activeView) {
      closeSettings();
    }
  }, [activeView?.id]);

  // refresh google forms data whenever source changes
  useEffect(() => {
    if (activeView) {
      if (activeView.fields.sourceType === 'google_form') {
        setLoadingFormResponses(true);
        charmClient.google.forms.syncFormResponses({ viewId: activeView.id }).finally(() => {
          setLoadingFormResponses(false);
        });
      }
    }
  }, [`${activeView?.fields.sourceData?.formId}${activeView?.fields.sourceData?.boardId}`]);

  const isLoadingSourceData = !activeBoard && state.showSettings !== 'create-linked-view';

  return (
    <div
      // remount components between pages
      className={`BoardComponent ${isEmbedded ? 'embedded-board' : ''}`}
      ref={backgroundRef}
      onClick={(e) => {
        backgroundClicked(e);
      }}
    >
      <Hotkeys keyName='ctrl+d,del,esc,backspace' onKeyDown={keydownHandler} />
      {!!boardPage?.deletedAt && <PageDeleteBanner pageId={board.id} />}
      {!props.hideBanner && board.fields.headerImage && (
        <Box className='PageBanner' width='100%' mb={2}>
          <PageBanner
            focalBoard
            headerImage={board.fields.headerImage}
            readOnly={props.readOnly}
            setPage={({ headerImage }) => setRandomHeaderImage(board, headerImage)}
          />
        </Box>
      )}
      <div className='top-head'>
        {board && (boardPageType === 'board' || !isEmbedded) && (
          <ViewTitle
            key={board.id + board.title}
            board={board}
            pageIcon={pageIcon}
            readOnly={props.readOnly}
            setPage={props.setPage}
          />
        )}
        <ViewHeader
          onDeleteView={props.onDeleteView}
          maxTabsShown={props.maxTabsShown}
          disableUpdatingUrl={props.disableUpdatingUrl}
          showView={props.showView}
          onClickNewView={
            boardPageType === 'inline_linked_board' || boardPageType === 'linked_board' ? openSelectSource : undefined
          }
          activeBoard={activeBoard}
          viewsBoard={board}
          activeView={props.activeView}
          toggleViewOptions={toggleViewOptions}
          cards={cards}
          views={props.views}
          dateDisplayProperty={dateDisplayProperty}
          addCard={() => addCard('', true)}
          showCard={showCard}
          // addCardFromTemplate={addCardFromTemplate}
          addCardTemplate={() => addCard('', true, {}, false, true)}
          editCardTemplate={editCardTemplate}
          readOnly={props.readOnly}
          readOnlySourceData={props.readOnlySourceData}
          embeddedBoardPath={props.embeddedBoardPath}
        />
      </div>

      <div className={`container-container ${state.showSettings ? 'sidebar-visible' : ''}`}>
        <Box display='flex' sx={{ minHeight: state.showSettings ? 450 : 0 }}>
          <Box width='100%'>
            {/* Show page title for inline boards */}
            {activeBoard && activePage && isEmbedded && boardPageType === 'inline_board' && (
              <InlineViewTitle
                key={activePage.id + activePage.title}
                board={activeBoard}
                readOnly={props.readOnly}
                setPage={props.setPage}
              />
            )}
            {activeBoard && activeView?.fields.sourceType === 'google_form' && (
              <Typography sx={{ fontSize: 22, fontWeight: 500 }}>
                Form responses to{' '}
                <Link
                  target='_blank'
                  href={`${activeView?.fields.sourceData?.formUrl}/edit#responses`}
                  sx={{ color: 'inherit', fontWeight: 700 }}
                >
                  {activeView?.fields.sourceData?.formName || 'Untitled'}
                  <LaunchIcon fontSize='small' sx={{ ml: 0.5, position: 'relative', top: 3 }} />
                </Link>
                {loadingFormResponses && (
                  <Box ml={2} component='span'>
                    <CircularProgress style={{ color: '#ccc', height: 14, width: 14 }} />
                  </Box>
                )}
              </Typography>
            )}
            {/* Show page title for linked boards */}
            {activePage &&
              activeView?.fields?.sourceType === 'board_page' &&
              boardPageType === 'inline_linked_board' && (
                <Button
                  color='secondary'
                  startIcon={<CallMadeIcon />}
                  variant='text'
                  size='large'
                  href={`${router.pathname.startsWith('/share') ? '/share' : ''}/${space?.domain}/${activePage?.path}`}
                  sx={{ fontSize: 22, fontWeight: 700, py: 0 }}
                >
                  {activePage.title || 'Untitled'}
                </Button>
              )}
            {!activeView && state.showSettings === 'create-linked-view' && (
              <CreateLinkedView
                readOnly={props.readOnly}
                onSelect={selectViewSource}
                onCreate={views.length === 0 ? createDatabase : undefined}
              />
            )}
            {activeBoard && activeView?.fields.viewType === 'board' && (
              <Kanban
                board={activeBoard}
                activeView={activeView}
                cards={cards}
                groupByProperty={groupByProperty}
                visibleGroups={visibleGroups}
                hiddenGroups={hiddenGroups}
                selectedCardIds={state.selectedCardIds}
                readOnly={props.readOnly || props.readOnlySourceData}
                onCardClicked={cardClicked}
                addCard={addCard}
                showCard={showCard}
              />
            )}
            {activeBoard && activeView?.fields.viewType === 'table' && (
              <Table
                board={activeBoard}
                activeView={activeView}
                cards={cards}
                groupByProperty={groupByProperty}
                views={props.views}
                visibleGroups={visibleGroups}
                selectedCardIds={state.selectedCardIds}
                readOnly={props.readOnly}
                readOnlySourceData={props.readOnlySourceData}
                cardIdToFocusOnRender={state.cardIdToFocusOnRender}
                showCard={showCard}
                addCard={addCard}
                onCardClicked={cardClicked}
              />
            )}
            {activeBoard && activeView?.fields.viewType === 'calendar' && (
              <CalendarFullView
                board={activeBoard}
                cards={cards}
                activeView={activeView}
                readOnly={props.readOnly || props.readOnlySourceData}
                dateDisplayProperty={dateDisplayProperty}
                showCard={showCard}
                addCard={(properties: Record<string, string>) => {
                  addCard('', true, properties);
                }}
              />
            )}
            {activeBoard && activeView?.fields.viewType === 'gallery' && (
              <Gallery
                board={activeBoard}
                cards={cards}
                activeView={activeView}
                readOnly={props.readOnly || props.readOnlySourceData}
                onCardClicked={cardClicked}
                selectedCardIds={state.selectedCardIds}
                addCard={(show) => addCard('', show)}
              />
            )}
            {isLoadingSourceData && <LoadingComponent isLoading={true} height={400} />}
          </Box>
          {activeView && (
            <ViewSidebar
              board={activeBoard}
              parentBoard={board}
              view={activeView}
              isOpen={state.showSettings === 'view-options'}
              closeSidebar={closeSettings}
              groupByProperty={groupByProperty}
            />
          )}
        </Box>
      </div>
    </div>
  );
}

export function groupCardsByOptions(
  cards: Card[],
  optionIds: string[],
  groupByProperty?: IPropertyTemplate
): BoardGroup[] {
  const groups = [];

  for (const optionId of optionIds) {
    if (optionId) {
      const option = groupByProperty?.options.find((o) => o.id === optionId);
      if (option) {
        const c = cards.filter((o) => optionId === o.fields.properties[groupByProperty!.id]);
        const group: BoardGroup = {
          option,
          cards: c
        };
        groups.push(group);
      }
    } else {
      // Empty group
      const emptyGroupCards = cards.filter((card) => {
        const groupByOptionId = card.fields.properties[groupByProperty?.id || ''];
        return !groupByOptionId || !groupByProperty?.options.find((option) => option.id === groupByOptionId);
      });
      const group: BoardGroup = {
        option: { id: '', value: `No ${groupByProperty?.name}`, color: '' },
        cards: emptyGroupCards
      };
      groups.push(group);
    }
  }
  return groups;
}

const connector = connect(undefined, { addCard: _addCard, addTemplate, updateView });

type PropsFromRedux = ConnectedProps<typeof connector>;

export default connector(injectIntl(CenterPanel));
