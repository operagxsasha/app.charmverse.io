import { NodeViewProps, PluginKey } from '@bangle.dev/core';
import { ReactNode, useMemo } from 'react';
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined';
import { Box, Typography } from '@mui/material';
import { useEditorViewContext } from '@bangle.dev/react';
import { useThreads } from 'hooks/useThreads';
import { findTotalInlineComments } from 'lib/inline-comments/findTotalInlineComments';
import styled from '@emotion/styled';
import { findTotalInlineVotes } from 'lib/inline-votes/findTotalInlineVotes';
import { useInlineVotes } from 'hooks/useInlineVotes';
import HowToVoteOutlinedIcon from '@mui/icons-material/HowToVoteOutlined';
import { renderSuggestionsTooltip } from './@bangle.dev/tooltip/suggest-tooltip';
import { InlineCommentPluginState } from './inlineComment';
import { InlineVotePluginState } from './inlineVote';

const InlineActionCountContainer = styled.div`
  position: absolute;
  top: 5px;
  display: flex;
  right: -40px;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  cursor: pointer;
  user-select: none;
`;

export default function Paragraph (
  { node, children, calculateActions = true, inlineCommentPluginKey, inlineVotePluginKey }:
  NodeViewProps & {
    children: ReactNode,
    calculateActions?: boolean,
    inlineCommentPluginKey: PluginKey<InlineCommentPluginState>,
    inlineVotePluginKey: PluginKey<InlineVotePluginState>
  }
) {
  const cardId = (new URLSearchParams(window.location.href)).get('cardId');
  const view = useEditorViewContext();
  const { threads } = useThreads();
  const { inlineVotes } = useInlineVotes();
  const { threadIds, totalInlineComments } = useMemo(() => (calculateActions || cardId)
    ? findTotalInlineComments(view, node, threads)
    : { threadIds: [], totalInlineComments: 0 }, [node, calculateActions, cardId, threads]);

  const { voteIds, totalInlineVotes } = useMemo(() => (calculateActions || cardId)
    ? findTotalInlineVotes(view, node, inlineVotes)
    : { voteIds: [], totalInlineVotes: 0 }, [node, calculateActions, cardId, inlineVotes]);

  return (
    <>
      {children}
      <InlineActionCountContainer>
        {totalInlineComments > 0 && (
          <Box
            display='flex'
            gap={0.5}
            alignItems='center'
            onClick={() => {
              renderSuggestionsTooltip(inlineCommentPluginKey, { ids: threadIds })(view.state, view.dispatch, view);
            }}
          >
            <CommentOutlinedIcon
              color='secondary'
              fontSize='small'
            />
            <Typography
              component='span'
              variant='subtitle1'
            >{totalInlineComments}
            </Typography>
          </Box>
        )}
        {totalInlineVotes > 0 && (
          <Box
            display='flex'
            gap={0.5}
            alignItems='center'
            onClick={() => {
              renderSuggestionsTooltip(inlineVotePluginKey, { ids: voteIds })(view.state, view.dispatch, view);
            }}
          >
            <HowToVoteOutlinedIcon
              color='secondary'
              fontSize='small'
            />
            <Typography
              component='span'
              variant='subtitle1'
            >{totalInlineVotes}
            </Typography>
          </Box>
        )}
      </InlineActionCountContainer>
    </>
  );
}
