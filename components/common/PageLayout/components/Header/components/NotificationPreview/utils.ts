import type { ProposalStatus } from '@charmverse/core/prisma';
import { NotificationType } from '@charmverse/core/prisma';

import type { BountyTask } from 'lib/notifications/getBountyNotifications';
import type {
  DiscussionNotification,
  ForumNotification,
  NotificationGroupType,
  ProposalNotification,
  VoteNotification
} from 'lib/notifications/interfaces';

function getForumContent(n: ForumNotification) {
  const { createdBy, commentId, postTitle } = n;
  if (commentId) {
    return createdBy?.username
      ? `${createdBy?.username} left a comment on ${postTitle}.`
      : `New comment on ${postTitle}.`;
  }

  return createdBy?.username
    ? `${createdBy?.username} created "${postTitle}" post on forum.`
    : `New forum post "${postTitle}"`;
}

export function getForumNotificationPreviewItems(notifications: ForumNotification[]) {
  return notifications.map((n) => ({
    id: n.id,
    createdAt: n.createdAt,
    createdBy: n.createdBy,
    spaceName: n.spaceName,
    groupType: 'forum' as NotificationGroupType,
    type: NotificationType.forum,
    href: `/${n.spaceDomain}/forum/post/${n.postPath}`,
    content: getForumContent(n),
    title: 'Forum Post'
  }));
}

function getDiscussionContent(n: DiscussionNotification) {
  const { createdBy, pageTitle } = n;
  return pageTitle
    ? `${createdBy?.username} left a comment in ${pageTitle}.`
    : `${createdBy?.username} left a comment.`;
}

export function getDiscussionsNotificationPreviewItems(notifications: DiscussionNotification[]) {
  return notifications.map((n) => ({
    id: n.id,
    createdAt: n.createdAt,
    createdBy: n.createdBy,
    spaceName: n.spaceName,
    groupType: 'discussions' as NotificationGroupType,
    type: NotificationType.mention,
    href: `/${n.spaceDomain}/${'pagePath' in n && n.pagePath}?mentionId=${n.mentionId}`,
    content: getDiscussionContent(n),
    title: 'Discussion'
  }));
}

function getBountyContent(n: BountyTask) {
  const { createdBy, action, pageTitle: title } = n;

  if (action === 'application_pending') {
    return `${createdBy?.username} applied for ${title} bounty.`;
  }

  if (action === 'work_submitted') {
    return `${createdBy?.username} submitted work for ${title} bounty.`;
  }

  if (action === 'application_approved') {
    return `Your application for ${title} bounty was approved.`;
  }

  if (action === 'application_rejected') {
    return `Your application for ${title} bounty has been rejected.`;
  }

  if (action === 'work_approved') {
    return `Your submission for ${title} bounty was approved.`;
  }

  if (action === 'payment_needed') {
    return `Bounty ${title} is ready for payment.`;
  }

  if (action === 'payment_complete') {
    return `Bounty ${title} has been paid.`;
  }

  if (action === 'suggested_bounty') {
    return createdBy?.username ? `${createdBy?.username} suggested new ${title} bounty.` : 'New bounty suggestion.';
  }

  return createdBy?.username
    ? `${createdBy?.username} updated ${title} bounty status.`
    : `Bounty status ${title} updated.`;
}

export function getBountiesNotificationPreviewItems(notifications: BountyTask[]) {
  return notifications.map((n) => ({
    id: n.id,
    createdAt: n.createdAt,
    createdBy: n.createdBy,
    spaceName: n.spaceName,
    groupType: 'bounties' as NotificationGroupType,
    type: NotificationType.bounty,
    href: `/${n.spaceDomain}/${n.pagePath}`,
    content: getBountyContent(n),
    title: 'Bounty'
  }));
}

function getProposalContent(n: ProposalNotification, currentUserId: string) {
  const status = 'status' in n ? n.status : null;
  const { createdBy, pageTitle: title } = n;
  const isCreator = currentUserId === createdBy?.id;
  if (status) {
    return createdBy?.username
      ? isCreator
        ? `You updated proposal ${title}`
        : `${createdBy?.username} updated proposal ${title}.`
      : `Proposal ${title} updated.`;
  }
  return createdBy?.username
    ? isCreator
      ? `You updated ${title} proposal.`
      : `${createdBy?.username} updated ${title} proposal.`
    : `Proposal ${title} updated.`;
}

function getProposalNotificationStatus(status: ProposalStatus) {
  switch (status) {
    case 'discussion':
      return 'Discussion';
    case 'review':
      return 'In Review';
    case 'reviewed':
      return 'Reviewed';
    case 'vote_active':
      return 'Vote Active';
    default:
      return '';
  }
}

export function getProposalsNotificationPreviewItems(notifications: ProposalNotification[], currentUserId?: string) {
  return notifications.map((n) => ({
    id: n.id,
    createdAt: n.createdAt,
    createdBy: n.createdBy || null,
    spaceName: n.spaceName,
    groupType: 'proposals' as NotificationGroupType,
    type: NotificationType.proposal,
    href: `/${n.spaceDomain}/${n.pagePath}`,
    content: getProposalContent(n, currentUserId || ''),
    title: `Proposal: ${getProposalNotificationStatus(n.status)}`
  }));
}

const getVoteContent = (n: VoteNotification, currentUserId: string) => {
  const { createdBy, title, userChoice } = n;
  const isCreator = currentUserId === createdBy?.id;
  if (userChoice) {
    return createdBy?.username ? `${createdBy?.username} added a vote in "${title}".` : `New vote in "${title}".`;
  }

  return createdBy?.username
    ? isCreator
      ? `You created new vote "${title}".`
      : `${createdBy?.username} created a poll "${title}".`
    : `Poll "${title}" created.`;
};

export function getVoteNotificationPreviewItems(notifications: VoteNotification[], currentUserId?: string) {
  return notifications.map((n) => ({
    id: n.id,
    createdAt: n.createdAt,
    createdBy: n.createdBy,
    spaceName: n.spaceName,
    groupType: 'votes' as NotificationGroupType,
    type: NotificationType.vote,
    href: `/${n.spaceDomain}/${n.pagePath}?voteId=${n.id}`,
    content: getVoteContent(n, currentUserId || ''),
    title: 'New Poll'
  }));
}
