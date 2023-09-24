import type { BountyStatus, PageType, ProposalStatus, User, VoteStatus } from '@charmverse/core/prisma';

export type NotificationGroupType = 'forum' | 'discussions' | 'votes' | 'proposals' | 'bounties';

export type NotificationActor = Pick<
  User,
  'id' | 'username' | 'path' | 'avatar' | 'avatarContract' | 'avatarTokenId' | 'avatarChain' | 'deletedAt'
>;

export type CommentNotification =
  | {
      type: 'comment.created';
      commentId: string;
    }
  | {
      type: 'comment.replied';
      commentId: string;
    }
  | {
      type: 'comment.mention.created';
      mentionId: string;
      commentId: string;
    };

export type InlineCommentNotification =
  | {
      type: 'inline_comment.created';
      inlineCommentId: string;
    }
  | {
      type: 'inline_comment.replied';
      inlineCommentId: string;
    }
  | {
      type: 'inline_comment.mention.created';
      mentionId: string;
      inlineCommentId: string;
    };

export type MentionNotification = {
  type: 'mention.created';
  mentionId: string;
};

export type CommentNotificationType = CommentNotification['type'];
export type InlineCommentNotificationType = InlineCommentNotification['type'];
export type MentionNotificationType = MentionNotification['type'];

interface NotificationBase {
  id: string;
  spaceId: string;
  spaceDomain: string;
  spaceName: string;
  createdAt: string;
  createdBy: NotificationActor | null;
}

export type DiscussionNotificationType = InlineCommentNotificationType | MentionNotificationType;
interface DiscussionNotificationBase extends NotificationBase {
  pageId: string;
  pagePath: string;
  pageTitle: string;
  pageType: PageType;
  bountyId: string | null;
  bountyTitle: string | null;
  type: DiscussionNotificationType;
  text: string;
  mentionId: null | string;
  inlineCommentId: null | string;
}

export type DiscussionNotification = DiscussionNotificationBase & (MentionNotification | InlineCommentNotification);

export type ForumNotificationType = CommentNotificationType | MentionNotificationType | 'post.created';

interface ForumNotificationBase extends NotificationBase {
  type: ForumNotificationType;
  postId: string;
  postPath: string;
  postTitle: string;
  commentId: null | string;
  mentionId: null | string;
  commentText: string;
}

export type ForumNotification = ForumNotificationBase &
  (
    | CommentNotification
    | MentionNotification
    | {
        type: 'post.created';
      }
  );

export type ProposalNotificationType =
  | CommentNotificationType
  | MentionNotificationType
  | InlineCommentNotificationType
  | 'start_review'
  | 'start_discussion'
  | 'start_vote'
  | 'review'
  | 'discuss'
  | 'vote'
  | 'evaluation_closed';

export type ProposalNotification = NotificationBase & {
  pageTitle: string;
  pagePath: string;
  status: ProposalStatus;
  pageId: string;
  type: ProposalNotificationType;
  commentId: string | null;
  inlineCommentId: string | null;
  mentionId: string | null;
} & (CommentNotification | MentionNotification | InlineCommentNotification);

export type VoteNotificationType = 'vote.created';

export type VoteNotification = NotificationBase & {
  status: VoteStatus;
  pagePath: string | null;
  pageTitle: string | null;
  pageType: PageType | null;
  postPath: string | null;
  postTitle: string | null;
  postCategoryId: string | null;
  type: VoteNotificationType;
  title: string;
  userChoice: string[] | null;
  deadline: Date;
};

export type BountyNotificationType =
  | MentionNotificationType
  | InlineCommentNotificationType
  | 'application.pending'
  | 'application.accepted'
  | 'application.rejected'
  | 'application.submitted'
  | 'application.approved'
  | 'application.payment_pending'
  | 'application.payment_completed'
  | 'suggestion_created';

export type BountyNotification =
  | (NotificationBase & {
      status: BountyStatus;
      pagePath: string;
      pageTitle: string;
      applicationId: string | null;
      type: BountyNotificationType;
    })
  | MentionNotification
  | InlineCommentNotification;

export type NotificationsGroup<T> = {
  marked: T[];
  unmarked: T[];
};
