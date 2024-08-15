import { GET } from '@root/adapters/http';
import { NEYNAR_API_BASE_URL, NEYNAR_API_KEY } from '@root/lib/farcaster/constants';
import { type FarcasterUser } from '@root/lib/farcaster/getFarcasterUsers';
import type { IframelyResponse } from '@root/lib/iframely/getIframely';

type UserProfile = {
  object: string;
  fid: number;
  custody_address: string;
  username: string;
  display_name: string;
  pfp_url: string;
  profile: {
    bio: {
      text: string;
      mentioned_profiles?: UserProfile[];
    };
  };
  follower_count: number;
  following_count: number;
  verifications: string[];
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  active_status: string;
  power_badge: boolean;
};

export type Cast = {
  object: 'cast';
  hash: string;
  thread_hash: string;
  parent_hash: string | null;
  parent_url: string | null;
  root_parent_url: string | null;
  parent_author: FarcasterUser;
  author: UserProfile;
  text: string;
  timestamp: string;
  embeds: (
    | {
        url: string;
        metadata?: {
          content_type: string;
          content_length: string;
        };
        embed?: IframelyResponse;
      }
    | {
        cast_id: {
          fid: number;
          hash: string;
          cast: Cast | undefined;
        };
      }
  )[];
  frames?: {
    version: string;
    title: string;
    image: string;
    image_aspect_ratio: string;
    buttons: {
      index: number;
      title: string;
      action_type: string;
      target?: string;
    }[];
    input: Record<string, unknown>;
    state: Record<string, unknown>;
    post_url: string;
    frames_url: string;
  }[];
  reactions: {
    likes_count: number;
    recasts_count: number;
    likes: {
      fid: number;
      fname: string;
    }[];
    recasts: {
      fid: number;
      fname: string;
    }[];
  };
  replies: {
    count: number;
  };
  channel: {
    id: string;
    name: string;
    image_url: string;
    object: 'channel_dehydrated';
  } | null;
  mentioned_profiles: UserProfile[];
};

type Reaction = {
  reaction_type: 'like' | 'cast';
  cast: Cast;
  reaction_timestamp: string;
  object: 'likes' | 'recasts';
};

type UserReactionsResponse = {
  reactions: Reaction[];
  next: {
    cursor: string | null;
  };
};

export async function getFarcasterUserReactions({ fid }: { fid: number }): Promise<Reaction[]> {
  const userReactionsResponse = await GET<UserReactionsResponse>(
    `${NEYNAR_API_BASE_URL}/reactions/user`,
    {
      fid,
      type: 'all'
    },
    {
      headers: {
        Api_key: NEYNAR_API_KEY
      }
    }
  );

  return userReactionsResponse.reactions;
}
